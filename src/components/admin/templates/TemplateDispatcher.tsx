"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ParsedMetaTemplate } from "@/lib/meta/templates";
import {
  type ChannelOption,
  type TemplateRecipient,
  TemplateRecipientFilter,
} from "@/lib/admin/templates";
import { type NormalizedSubscriptionStatus } from "@/lib/admin/subscriptions";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Send, Upload, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

type ApiFailure = {
  userId: string;
  reason: string;
};

interface TemplateDispatcherProps {
  templates: ParsedMetaTemplate[];
  channelOptions: ChannelOption[];
  defaultFilters?: TemplateRecipientFilter;
}

const subscriptionStatusOptions: Array<{
  value: NormalizedSubscriptionStatus;
  label: string;
}> = [
  { value: "trialing", label: "Trialing" },
  { value: "subscribed", label: "Subscribed" },
  { value: "past_due", label: "Past Due" },
  { value: "canceled", label: "Canceled" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

export function TemplateDispatcher({
  templates,
  channelOptions,
  defaultFilters,
}: TemplateDispatcherProps) {
  const [searchTerm, setSearchTerm] = useState(defaultFilters?.search ?? "");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  const [selectedChannels, setSelectedChannels] = useState<string[]>(() => {
    if (defaultFilters?.channelIds?.length) {
      return defaultFilters.channelIds;
    }
    if (channelOptions.some((option) => option.id === "whatsapp")) {
      return ["whatsapp"];
    }
    return channelOptions.map((option) => option.id);
  });
  const [selectedStatuses, setSelectedStatuses] = useState<
    NormalizedSubscriptionStatus[]
  >(defaultFilters?.subscriptionStatuses ?? []);
  const [verifiedOnly, setVerifiedOnly] = useState(
    defaultFilters?.verifiedOnly ?? true
  );
  const [limit, setLimit] = useState(defaultFilters?.limit ?? 20);
  const [page, setPage] = useState(1);
  const [totalRecipients, setTotalRecipients] = useState(0);
  
  const [recipients, setRecipients] = useState<TemplateRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [lastFailures, setLastFailures] = useState<ApiFailure[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(() => {
    return templates[0] ? `${templates[0].name}::${templates[0].language}` : "";
  });
  const selectedTemplate = useMemo(
    () => templates.find((template) => {
      return `${template.name}::${template.language}` === selectedTemplateKey;
    }),
    [selectedTemplateKey, templates]
  );

  useEffect(() => {
    if (!templates.length) {
      setSelectedTemplateKey("");
      return;
    }

    if (
      selectedTemplateKey &&
      !templates.some(
        (template) =>
          `${template.name}::${template.language}` === selectedTemplateKey
      )
    ) {
      setSelectedTemplateKey(`${templates[0].name}::${templates[0].language}`);
    }
  }, [templates, selectedTemplateKey]);

  useEffect(() => {
    if (!selectedTemplate) {
      setParameterValues({});
      return;
    }
    const initialValues = selectedTemplate.parameters.reduce<
      Record<string, { value: string; filename?: string }>
    >((acc, parameter) => {
      acc[parameter.id] = {
        value: parameter.defaultMediaHandle ?? "",
      };
      return acc;
    }, {});
    setParameterValues(initialValues);
  }, [selectedTemplateKey, selectedTemplate?.parameters.length]);

  const [parameterValues, setParameterValues] = useState<
    Record<string, { value: string; filename?: string }>
  >({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const fetchRecipients = async () => {
    setLoading(true);
    setError(null);
    setSendStatus(null);
    try {
      const payload: TemplateRecipientFilter = {
        search: debouncedSearchTerm || undefined,
        subscriptionStatuses:
          selectedStatuses.length > 0 ? selectedStatuses : undefined,
        channelIds: selectedChannels.length > 0 ? selectedChannels : undefined,
        verifiedOnly,
        limit,
        offset: (page - 1) * limit,
      };
      const response = await fetch("/api/admin/templates/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to load recipients");
        setRecipients([]);
        setTotalRecipients(0);
        return;
      }

      const data = await response.json();
      setRecipients(data.recipients ?? []);
      setTotalRecipients(data.total ?? 0);
      // Keep selected users if they are still in the list, otherwise filter them out?
      // Actually, we should probably keep them selected even if they are not in the current page
      // But for simplicity, let's clear selection on filter change if it's a new search
      // For pagination, we might want to keep selection.
      // For now, let's keep the behavior of clearing selection on new fetch to avoid confusion
      // unless we implement cross-page selection which is complex.
      setSelectedUserIds([]);
    } catch (fetchError) {
      console.error("[TEMPLATE_DISPATCH_SEARCH_ERROR]", fetchError);
      setError("Unable to reach the search API");
      setRecipients([]);
      setTotalRecipients(0);
    } finally {
      setLoading(false);
    }
  };

  // Effect to trigger fetch when filters change
  useEffect(() => {
    setPage(1); // Reset to first page on filter change
  }, [debouncedSearchTerm, selectedChannels, selectedStatuses, verifiedOnly, limit]);

  useEffect(() => {
    void fetchRecipients();
  }, [page, debouncedSearchTerm, selectedChannels, selectedStatuses, verifiedOnly, limit]);

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const toggleStatus = (status: NormalizedSubscriptionStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status]
    );
  };

  const toggleRecipient = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === recipients.length) {
      setSelectedUserIds([]);
      return;
    }
    setSelectedUserIds(recipients.map((recipient) => recipient.userId));
  };

  const handleFileUpload = async (
    file: File,
    paramId: string,
    mediaType: string
  ) => {
    setUploading((prev) => ({ ...prev, [paramId]: true }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", file.type);

      const response = await fetch("/api/admin/templates/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const mediaId = data.id;

      if (mediaId) {
        setParameterValues((prev) => ({
          ...prev,
          [paramId]: {
            value: mediaId,
            filename: mediaType === "document" ? file.name : undefined,
          },
        }));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload media");
    } finally {
      setUploading((prev) => ({ ...prev, [paramId]: false }));
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate || selectedUserIds.length === 0) return;
    setIsSending(true);
    setSendStatus(null);
    setLastFailures([]);

    const trimmedParameterValues = selectedTemplate.parameters.map((param) => {
      const paramData = parameterValues[param.id];
      return {
        id: param.id,
        value: (paramData?.value ?? "").trim(),
        filename: paramData?.filename,
      };
    });

    try {
      const response = await fetch("/api/admin/templates/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateName: selectedTemplate.name,
          language: selectedTemplate.language,
          recipientIds: selectedUserIds,
          parameterValues: trimmedParameterValues,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        setSendStatus(body.error ?? "Failed to send template");
        return;
      }

      const delivered = body.delivered?.length ?? 0;
      const failures: ApiFailure[] = body.failures ?? [];
      setLastFailures(failures);
      setSendStatus(
        `Delivered to ${delivered} user(s); ${failures.length} failure(s)`
      );
      setSelectedUserIds([]);
    } catch (sendError) {
      console.error("[TEMPLATE_DISPATCH_SEND_ERROR]", sendError);
      setSendStatus("Unable to send templates. Check logs for details.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recipient Filters</CardTitle>
            <CardDescription>
              Filter users before selecting recipients for Meta templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-search">Search</Label>
              <Input
                id="template-search"
                placeholder="Email, name or nickname"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="flex flex-wrap gap-2">
                {channelOptions.map((channel) => {
                  const selected = selectedChannels.includes(channel.id);
                  return (
                    <Badge
                      key={channel.id}
                      variant={selected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all hover:opacity-80",
                        !selected && "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => toggleChannel(channel.id)}
                    >
                      {channel.id}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subscription Status</Label>
              <div className="flex flex-wrap gap-2">
                {subscriptionStatusOptions.map((option) => {
                  const selected = selectedStatuses.includes(option.value);
                  return (
                    <Badge
                      key={option.value}
                      variant={selected ? "secondary" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all hover:opacity-80",
                        !selected && "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => toggleStatus(option.value)}
                    >
                      {option.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={verifiedOnly}
                  onCheckedChange={(value) => setVerifiedOnly(Boolean(value))}
                  id="verified-only"
                />
                <Label htmlFor="verified-only" className="mb-0 cursor-pointer">
                  Only verified channels
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="recipient-limit" className="mb-0 whitespace-nowrap">
                  Limit
                </Label>
                <Input
                  id="recipient-limit"
                  type="number"
                  min={1}
                  max={500}
                  value={limit}
                  onChange={(event) =>
                    setLimit(Math.min(500, Math.max(1, Number(event.target.value) || 1)))
                  }
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {totalRecipients} users found
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {Math.max(1, Math.ceil(totalRecipients / limit))}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= totalRecipients || loading}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="size-4 inline-block mr-1" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Selection</CardTitle>
            <CardDescription>Pick a Meta template and fill placeholders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No templates available. Check Meta credentials or try again later.
              </p>
            )}

            {templates.length > 0 && (
              <>
                <Select
                  value={selectedTemplateKey}
                  onValueChange={setSelectedTemplateKey}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => {
                      const key = `${template.name}::${template.language}`;
                      return (
                        <SelectItem key={key} value={key}>
                          {template.name} ({template.language})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {selectedTemplate?.parameters.length ? (
                  <div className="space-y-4">
                {selectedTemplate.parameters.map((parameter) => {
                  const isMediaParam = Boolean(parameter.mediaFormat);
                  const defaultValue = parameter.defaultMediaHandle;
                  const isScontent = defaultValue?.includes("scontent");
                  
                  const placeholder = parameter.hint
                    ? parameter.hint
                    : isMediaParam
                      ? isScontent
                        ? "Default media is active. Upload new file to override."
                        : "https://example.com/video.mp4 or Meta Media ID"
                      : "Insert value";

                  const currentValue =
                    parameterValues[parameter.id]?.value ?? defaultValue ?? "";
                  const currentFilename = parameterValues[parameter.id]?.filename;

                  // If the current value is the default scontent URL, we show it as empty in the input
                  // to keep the UI clean, but we keep track of it in the state.
                  // If the user types something, it overrides the default.
                  const displayValue =
                    isScontent && currentValue === defaultValue ? "" : currentValue;

                  return (
                    <div key={parameter.id} className="space-y-1">
                      <Label htmlFor={`param-${parameter.id}`}>
                        {parameter.label}
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            id={`param-${parameter.id}`}
                            type={isMediaParam ? "text" : "text"}
                            value={displayValue}
                            onChange={(event) =>
                              setParameterValues((prev) => ({
                                ...prev,
                                [parameter.id]: {
                                  ...prev[parameter.id],
                                  value: event.target.value,
                                },
                              }))
                            }
                            placeholder={placeholder}
                          />
                        </div>
                        {isMediaParam && (
                          <div className="relative">
                            <input
                              type="file"
                              id={`file-${parameter.id}`}
                              className="hidden"
                              accept={
                                parameter.mediaFormat === "image"
                                  ? "image/*"
                                  : parameter.mediaFormat === "video"
                                    ? "video/*"
                                    : parameter.mediaFormat === "document"
                                      ? "application/pdf"
                                      : "*/*"
                              }
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(
                                    file,
                                    parameter.id,
                                    parameter.mediaFormat!
                                  );
                                }
                                // Reset input value to allow re-uploading same file
                                e.target.value = "";
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={uploading[parameter.id]}
                              onClick={() =>
                                document
                                  .getElementById(`file-${parameter.id}`)
                                  ?.click()
                              }
                            >
                              {uploading[parameter.id] ? (
                                <RefreshCw className="size-4 animate-spin" />
                              ) : (
                                <Upload className="size-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      {currentFilename && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="size-3" />
                          <span>Filename: {currentFilename}</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {isMediaParam ? (
                          defaultValue
                            ? isScontent
                              ? "Default media is set. Upload a file or enter a URL to replace it."
                              : `Default: ${defaultValue}. Or upload/enter new media.`
                            : "Upload file or enter HTTPS URL / Media ID."
                        ) : parameter.hint ? (
                          `Context: ${parameter.hint}`
                        ) : (
                          "Value sent to Meta template."
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This template does not require additional parameters.
              </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Recipients</CardTitle>
            <CardDescription>
              {selectedUserIds.length} selected on this page
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleSend}
              disabled={
                isSending ||
                selectedUserIds.length === 0 ||
                !selectedTemplate ||
                templates.length === 0
              }
            >
              <Send className="size-4" />
              Trigger template
            </Button>
            <span className="text-xs text-muted-foreground">
              {selectedUserIds.length ? `${selectedUserIds.length} recipients` : "Select recipients first"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-0">
                    <Checkbox
                      checked={
                        recipients.length > 0 &&
                        selectedUserIds.length === recipients.length
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all recipients"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => {
                  const whatsappChannel = recipient.channels.find(
                    (channel) => channel.channelId === "whatsapp"
                  );
                  return (
                    <TableRow key={recipient.userId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUserIds.includes(recipient.userId)}
                          onCheckedChange={() => toggleRecipient(recipient.userId)}
                          aria-label={`Select ${recipient.email}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold">
                            {recipient.firstName} {recipient.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {recipient.nickname}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{recipient.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {recipient.subscription.normalizedStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {recipient.channels.map((channel) => (
                            <Badge
                              key={channel.userChannelId}
                              variant={channel.isVerified ? "success" : "outline"}
                            >
                              {channel.channelId}
                              {channel.isVerified ? " ✓" : ""}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {recipient.totalRequestsUsed} req /{" "}
                          {recipient.totalTokensUsed} tokens
                          {whatsappChannel && (
                            <p className="text-[0.65rem] text-muted-foreground/80">
                              {whatsappChannel.link}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {recipients.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No recipients match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground">Loading recipients…</p>
          )}

          {sendStatus && (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary-foreground">
              {sendStatus}
              {lastFailures.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                  {lastFailures.map((failure) => (
                    <li key={failure.userId}>
                      {failure.userId}: {failure.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
