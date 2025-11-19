import { unstable_cache as nextCache } from "next/cache";
import { getEnv, type Env } from "@/lib/config/env";

const GRAPH_API_VERSION = "v24.0";

export interface MetaTemplateComponent {
  type: string;
  text?: string;
  format?: string;
  example?: string;
}

export interface TemplateParameterDefinition {
  id: string;
  componentType: string;
  placeholderIndex: number;
  label: string;
  hint?: string;
  parameterName?: string;
  mediaFormat?: MediaFormat;
  defaultMediaHandle?: string;
}

export interface ParsedMetaTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  components: MetaTemplateComponent[];
  parameters: TemplateParameterDefinition[];
  parameterFormat: "NAMED" | "POSITIONAL" | string;
}

export type MediaFormat = "image" | "video" | "document" | "audio";

type LanguageReference =
  | { code?: string }
  | string
  | undefined
  | { language?: LanguageReference };

type MetaTemplateRaw = {
  name: string;
  language?: LanguageReference;
  category?: string;
  status?: string;
  parameter_format?: "NAMED" | "POSITIONAL" | string;
  components?: Array<{
    type?: string;
    text?: string;
    format?: string;
    example?: string;
  }>;
  languages?: {
    data?: Array<{
      language?: LanguageReference;
      components?: Array<{
        type?: string;
        text?: string;
        format?: string;
        example?: string;
      }>;
    }>;
  };
};

const MEDIA_FORMATS = new Set(["IMAGE", "VIDEO", "DOCUMENT", "AUDIO"]);

function normalizeLanguageCode(value?: LanguageReference): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    const possible = (value as { code?: string }).code ?? (value as { language?: LanguageReference }).language;
    return normalizeLanguageCode(possible);
  }
  return "";
}

function buildParameters(components: MetaTemplateComponent[]): TemplateParameterDefinition[] {
  const parameterDefinitions: TemplateParameterDefinition[] = [];

  components.forEach((component) => {
    const normalizedType = component.type || "BODY";
    const text = component.text;

    if (text) {
      const placeholderRegex = /{{\s*([^}\s]+)\s*}}/g;
      const seen = new Set<number>();

      let match: RegExpExecArray | null;
      while ((match = placeholderRegex.exec(text))) {
        const rawValue = match[1];
        const numericIndex = Number(rawValue);
        const parsedIndex = Number.isNaN(numericIndex) ? seen.size + 1 : numericIndex;
        if (seen.has(parsedIndex)) {
          continue;
        }
        seen.add(parsedIndex);
        const label = `${normalizedType.toLowerCase()} parameter ${parsedIndex}`;
        parameterDefinitions.push({
          id: `${normalizedType.toLowerCase()}-${rawValue}-${parsedIndex}`,
          componentType: normalizedType,
          placeholderIndex: parsedIndex,
          label,
          hint: text,
          parameterName: rawValue,
        });
      }
    }

    if (
      normalizedType === "HEADER" &&
      component.format &&
      MEDIA_FORMATS.has(component.format.toUpperCase())
    ) {
      const mediaFormat = component.format.toLowerCase() as MediaFormat;
      parameterDefinitions.push({
        id: `${normalizedType.toLowerCase()}-${mediaFormat}-media`,
        componentType: normalizedType,
        placeholderIndex: Number.MAX_SAFE_INTEGER,
        label: `Header ${mediaFormat} URL or media ID`,
        mediaFormat,
      });
    }
  });

  return parameterDefinitions;
}

async function fetchMetaTemplatesFromApi(): Promise<ParsedMetaTemplate[]> {
  const env = getEnv();
  const businessAccountId = await resolveBusinessAccountId(env);
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${businessAccountId}/message_templates?limit=100&status=APPROVED&fields=name,category,status,parameter_format,components,languages.limit(100){language,components},language`;
  console.info("[META_TEMPLATES_FETCH]", { url });
  console.info("[META_BUSINESS_ACCOUNT_FETCH]", { url });
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[META_TEMPLATES_FETCH_ERROR]", {
      url,
      status: response.status,
      body: errorBody,
    });
    throw new Error(
      `Meta templates API responded with ${response.status}: ${errorBody}`
    );
  }

  const payload = await response.json();
  const templates = Array.isArray(payload?.data) ? payload.data : [];

  const result: ParsedMetaTemplate[] = [];

  templates.forEach((template: MetaTemplateRaw) => {
    const languages = template.languages?.data ?? [];
    const fallbackLanguage = normalizeLanguageCode(template.language) || "en_US";
    const languageEntries =
      languages.length > 0
        ? languages
        : [
            {
              language: template.language,
              components: template.components,
            },
          ];

    languageEntries.forEach((langEntry) => {
      const languageCode = normalizeLanguageCode(langEntry.language) || fallbackLanguage;
      const componentsFromLang = langEntry.components ?? [];
      const mappedComponents: MetaTemplateComponent[] = componentsFromLang.map(
        (component) => ({
          type: component.type || "BODY",
          text: component.text,
          format: component.format,
          example: component.example,
        })
      );

      const finalComponents =
        mappedComponents.length > 0
          ? mappedComponents
          : (template.components ?? []).map((component) => ({
              type: component.type || "BODY",
              text: component.text,
              format: component.format,
              example: component.example,
            }));

      if (finalComponents.length === 0) {
        return;
      }

      result.push({
        name: template.name,
        language: languageCode || "en_US",
        category: template.category || "general",
        status: template.status || "unknown",
        components: finalComponents,
        parameters: buildParameters(finalComponents),
        parameterFormat: template.parameter_format || "POSITIONAL",
      });
    });
  });

  return result;
}

const cachedMetaTemplates = nextCache(fetchMetaTemplatesFromApi, ["meta_templates"], {
  revalidate: 300,
});

export async function getMetaTemplates(): Promise<ParsedMetaTemplate[]> {
  return cachedMetaTemplates();
}

export const META_GRAPH_API_VERSION = GRAPH_API_VERSION;

async function resolveBusinessAccountId(env: Env): Promise<string> {
  if (env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
    return env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}?fields=whatsapp_business_account`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[META_BUSINESS_ACCOUNT_FETCH_ERROR]", {
      url,
      status: response.status,
      body: errorBody,
    });
    throw new Error(
      `Failed to resolve WhatsApp Business Account: ${response.status} ${errorBody}`
    );
  }

  const payload = await response.json();
  const account = payload?.whatsapp_business_account;
  const id = account?.id;
  if (!id) {
    throw new Error("WhatsApp Business Account ID not available");
  }
  return id;
}
