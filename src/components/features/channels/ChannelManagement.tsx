"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Phone,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import { useLocaleRouter } from "@/hooks/use-locale-router";
import { useTranslations } from "next-intl";

interface Channel {
  id: string;
  link: string;
  verified_at: string | null;
  channels: {
    id: string;
    link_method: string;
    is_active: boolean;
  };
}

interface ChannelManagementProps {
  channels: Channel[];
}

export function ChannelManagement({ channels }: ChannelManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useLocaleRouter();
  const t = useTranslations('dashboard');

  const getChannelIcon = (channelId: string) => {
    switch (channelId.toLowerCase()) {
      case "whatsapp":
        return <Phone className="h-6 w-6" />;
      case "telegram":
        return <MessageCircle className="h-6 w-6" />;
      default:
        return <LinkIcon className="h-6 w-6" />;
    }
  };

  const formatChannelId = (channelId: string, link: string) => {
    switch (channelId.toLowerCase()) {
      case "whatsapp":
        return link; // Phone number
      case "telegram":
        return link; // Username with @
      default:
        return link;
    }
  };

  const handleDeleteChannel = async (
    channelId: string,
    channelName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to disconnect ${channelName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      console.info("CHANNEL_DELETE_ATTEMPT", {
        channelId,
        channelName,
      });

      const response = await fetch(`/api/channels/${channelId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete channel");
      }

      console.info("CHANNEL_DELETE_SUCCESS", {
        channelId,
        channelName,
      });

      // Refresh the page to show updated channel list
      router.refresh();
    } catch (error) {
      console.error("CHANNEL_DELETE_ERROR", {
        error,
        channelId,
        channelName,
      });
      alert(
        `Failed to delete channel: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };
 
  const handleTestChannel = async (channelId: string) => {
    setIsLoading(true);
    try {
      console.info("CHANNEL_TEST_ATTEMPT", { channelId });
      alert("Channel testing functionality will be implemented soon");
    } catch (error) {
      console.error("CHANNEL_TEST_ERROR", { error, channelId });
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Add New Channel Button */}
      <Card className="hover-lift overflow-hidden relative border-2">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />

        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3">
            <div className="p-3 bg-muted rounded-lg shadow-lg">
              <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground leading-tight break-words">
              {t('channelMgmt.addNew.title')}
            </span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base font-semibold text-muted-foreground leading-snug break-words">
            {t('channelMgmt.addNew.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <Button
            onClick={() => router.push("/dashboard/channels/add")}
            className="w-full h-auto p-4 sm:p-5 transition-all duration-300 group border-2 bg-card hover:bg-accent border-border hover:border-accent text-foreground whitespace-normal text-left"
          >
            <div className="flex items-center gap-4 min-w-0 w-full">
              <div className="p-3 bg-accent group-hover:bg-accent rounded-lg transition-all duration-300">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground group-hover:scale-110 transition-all duration-300" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-bold text-base sm:text-lg text-foreground leading-tight whitespace-normal break-words">
                  {t('channelMgmt.addNew.button')}
                </div>
                <div className="text-sm text-muted-foreground whitespace-normal break-all sm:break-words hyphens-auto leading-snug max-w-full overflow-hidden">
                  {t('channelMgmt.addNew.connectFirstPlatform')}
                </div>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Connected Channels */}
      <Card className="hover-lift overflow-hidden relative border-2">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-accent/10 pointer-events-none" />

        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3">
            <div className="p-3 bg-muted rounded-lg shadow-lg">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">
              {t('channelMgmt.connected.title')}
            </span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base font-semibold text-muted-foreground">
            {t('channelMgmt.connected.description', {count: channels.length})}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {channels.length > 0 ? (
            <div className="space-y-4">
              {channels.map((userChannel, index) => (
                <div
                  key={userChannel.id}
                  className="group p-4 sm:p-5 rounded-xl bg-card border-2 border-border hover:border-accent transition-all duration-300 hover:shadow-lg animate-fade-in hover-scale"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                      <div className="p-3 bg-accent group-hover:bg-accent/90 rounded-lg transition-all duration-300">
                        {React.cloneElement(
                          getChannelIcon(
                            userChannel.channels.id
                          ) as React.ReactElement<
                            React.SVGProps<SVGSVGElement>
                          >,
                          {
                            className:
                              "h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground group-hover:scale-110 transition-all duration-300",
                          }
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-base sm:text-lg capitalize text-foreground group-hover:text-accent transition-colors truncate max-w-[75vw] sm:max-w-none">
                            {userChannel.channels.id}
                          </h3>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground whitespace-nowrap truncate sm:whitespace-normal break-words">
                          {formatChannelId(
                            userChannel.channels.id,
                            userChannel.link
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {userChannel.verified_at ? (
                            <>
                              <CheckCircle className="h-5 w-5 text-success" />
                              <Badge variant="success">{t('channelMgmt.connected.verified')}</Badge>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-5 w-5 text-warning" />
                              <Badge variant="warning">
                                {t('channelMgmt.connected.pendingVerification')}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex items-center gap-2 flex-wrap justify-end sm:justify-start">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestChannel(userChannel.id)}
                        disabled={true}
                        className="transition-all duration-300 hover:scale-105"
                      >
                        {t('channelMgmt.connected.test')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDeleteChannel(
                            userChannel.id,
                            userChannel.channels.id
                          )
                        }
                        disabled={isLoading}
                        className="text-destructive hover:text-destructive/80 transition-all duration-300 hover:scale-105"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <div className="p-6 bg-muted/50 rounded-full w-fit mx-auto mb-6">
                <MessageCircle className="h-16 w-16 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">
                {t('channelMgmt.empty.title')}
              </h3>
              <p className="text-muted-foreground mb-6 text-base">
                {t('channelMgmt.empty.description')}
              </p>
              <Button
                onClick={() => router.push("/dashboard/channels/add")}
                className="transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('channelMgmt.empty.cta')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
