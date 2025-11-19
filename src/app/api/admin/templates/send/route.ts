import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminForApi } from "@/lib/auth/admin";
import {
  getMetaTemplates,
  META_GRAPH_API_VERSION,
} from "@/lib/meta/templates";
import { getEnv } from "@/lib/config/env";
import { fetchTemplateRecipientsByIds } from "@/lib/admin/templates";

const sendSchema = z.object({
  templateName: z.string().min(1),
  language: z.string().min(1),
  recipientIds: z.array(z.string().uuid()).min(1),
  parameterValues: z
    .array(
      z.object({
        id: z.string(),
        value: z.string().transform((val) => val.trim()),
        filename: z.string().optional(),
      })
    )
    .optional(),
});

interface ApiFailure {
  userId: string;
  reason: string;
}

function sanitizePhoneNumber(value: string): string | null {
  if (!value) return null;
  const normalized = value.replace(/[^+\d]/g, "");
  if (normalized.length < 8) return null;
  return normalized;
}

export async function POST(req: Request) {
  const adminId = await requireAdminForApi();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid template delivery payload", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { templateName, language, recipientIds, parameterValues } = parsed.data;
  const templates = await getMetaTemplates();
  const template = templates.find(
    (item) =>
      item.name === templateName &&
      item.language.toLowerCase() === language.toLowerCase()
  );

  if (!template) {
    return NextResponse.json(
      { error: "Unknown template or language" },
      { status: 404 }
    );
  }

  const providedValues = new Map<string, { value: string; filename?: string }>(
    (parameterValues || []).map((param) => [
      param.id,
      { value: param.value, filename: param.filename },
    ])
  );

  const parameterValueMap = new Map<
    string,
    { value: string; filename?: string }
  >();
  for (const definition of template.parameters) {
    const provided = providedValues.get(definition.id);
    if (provided) {
      parameterValueMap.set(definition.id, provided);
      continue;
    }

    if (definition.mediaFormat && definition.defaultMediaHandle) {
      parameterValueMap.set(definition.id, {
        value: definition.defaultMediaHandle,
      });
    }
  }

  for (const definition of template.parameters) {
    if (!parameterValueMap.has(definition.id)) {
      return NextResponse.json(
        { error: `Missing parameter value for ${definition.label}` },
        { status: 400 }
      );
    }
  }

  const isNamedFormat = template.parameterFormat === "NAMED";

  const componentsPayload = template.components
    .map((component) => {
      const relevantParams = template.parameters
        .filter((param) => param.componentType === component.type)
        .sort((a, b) => a.placeholderIndex - b.placeholderIndex);

      if (relevantParams.length > 0) {
        const parameters = relevantParams.map((param) => {
          const paramData = parameterValueMap.get(param.id);
          const value = paramData?.value ?? "";

          if (param.mediaFormat) {
            const mediaType = param.mediaFormat;
            const payload: Record<string, unknown> =
              value.startsWith("http://") || value.startsWith("https://")
                ? { link: value }
                : { id: value };

            if (mediaType === "document" && paramData?.filename) {
              payload.filename = paramData.filename;
            }

            return {
              type: mediaType,
              [mediaType]: payload,
            } as Record<string, unknown>;
          }

          const entry: Record<string, unknown> = {
            type: "text",
            text: value,
          };
          if (isNamedFormat && param.parameterName) {
            entry.parameter_name = param.parameterName;
          }
          return entry;
        });

        const hasNonEmptyParameter = parameters.some((entry) => {
          if (entry.type === "text") {
            return Boolean((entry as { text?: string }).text);
          }
          return true;
        });

        if (!hasNonEmptyParameter) {
          return null;
        }

        return {
          type: component.type?.toLowerCase() ?? "body",
          parameters,
        };
      }

      return null;
    })
    .filter((component): component is { type: string; parameters: Record<string, unknown>[] } =>
      Boolean(component)
    );

  const recipients = await fetchTemplateRecipientsByIds(recipientIds);
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients found for provided IDs" },
      { status: 400 }
    );
  }
  const env = getEnv();
  const endpoint = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const headers = {
    Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    "Content-Type": "application/json",
  };

  const failures: ApiFailure[] = [];
  const successes: string[] = [];

  for (const recipient of recipients) {
    const whatsappChannel = recipient.channels.find(
      (channel) =>
        channel.channelId?.toLowerCase() === "whatsapp" &&
        !!channel.link
    );

    if (!whatsappChannel) {
      failures.push({
        userId: recipient.userId,
        reason: "No WhatsApp contact available",
      });
      continue;
    }

    const to = sanitizePhoneNumber(whatsappChannel.link);
    if (!to) {
      failures.push({
        userId: recipient.userId,
        reason: "Invalid WhatsApp contact format",
      });
      continue;
    }

    const templatePayload: Record<string, unknown> = {
      name: template.name,
      language: { code: template.language },
    };

    if (componentsPayload.length > 0) {
      templatePayload.components = componentsPayload;
    }

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: templatePayload,
    };

    try {
      console.info("[ADMIN_TEMPLATE_SEND_REQUEST]", {
        to,
        template: template.name,
        language: template.language,
        hasComponents: Boolean(templatePayload.components),
      });
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const responseBody = await response.json().catch(() => null);
      console.info("[ADMIN_TEMPLATE_SEND_RESPONSE]", {
        recipientId: recipient.userId,
        status: response.status,
        body: JSON.stringify(responseBody),
      });

      if (!response.ok) {
        console.error("[ADMIN_TEMPLATE_SEND_ERROR]", {
          response: responseBody,
          adminId,
          recipientId: recipient.userId,
        });
        failures.push({
          userId: recipient.userId,
          reason:
            responseBody?.error?.message ?? "Meta API rejected the message",
        });
        continue;
      }

      successes.push(recipient.userId);
    } catch (error) {
      console.error("[ADMIN_TEMPLATE_SEND_EXCEPTION]", {
        error,
        recipientId: recipient.userId,
      });
      failures.push({
        userId: recipient.userId,
        reason: "Failed to reach Meta API",
      });
    }
  }

  return NextResponse.json(
    {
      template: { name: template.name, language: template.language },
      delivered: successes,
      failures,
    },
    { status: failures.length === 0 ? 200 : 207 }
  );
}
