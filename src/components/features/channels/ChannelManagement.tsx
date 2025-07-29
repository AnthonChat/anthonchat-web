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
import { useRouter } from "next/navigation";
import { uiLogger } from "@/lib/logging/loggers";

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
	const router = useRouter();

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
				return `@${link}`; // Username with @
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
			uiLogger.info("CHANNEL_DELETE_ATTEMPT", "CHANNEL_MANAGEMENT", {
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

			uiLogger.info("CHANNEL_DELETE_SUCCESS", "CHANNEL_MANAGEMENT", {
				channelId,
				channelName,
			});

			// Refresh the page to show updated channel list
			router.refresh();
		} catch (error) {
			uiLogger.error("CHANNEL_DELETE_ERROR", error instanceof Error ? error : new Error(String(error)));
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
			// TODO: Implement channel testing
			uiLogger.info("CHANNEL_TEST_ATTEMPT", "CHANNEL_MANAGEMENT", {
				channelId,
			});
			alert("Channel testing functionality will be implemented soon");
		} catch (error) {
			uiLogger.error("CHANNEL_TEST_ERROR", error instanceof Error ? error : new Error(String(error)));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Add New Channel Button */}
			<Card className="hover-lift overflow-hidden relative border-2">
				{/* Background Pattern */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
				
				<CardHeader className="relative">
					<CardTitle className="flex items-center gap-3">
						<div className="p-3 bg-muted rounded-lg shadow-lg">
							<Plus className="h-6 w-6 text-muted-foreground" />
						</div>
						<span className="text-xl font-bold text-foreground">Add New Channel</span>
					</CardTitle>
					<CardDescription className="text-base font-semibold text-muted-foreground">
						Connect a new communication channel to expand your reach
					</CardDescription>
				</CardHeader>
				<CardContent className="relative">
					<Button
						onClick={() => router.push("/dashboard/channels/add")}
						className="w-full h-auto p-5 transition-all duration-300 group border-2 bg-card hover:bg-accent border-border hover:border-accent text-foreground">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-accent group-hover:bg-accent rounded-lg transition-all duration-300">
								<Plus className="h-6 w-6 text-accent-foreground group-hover:scale-110 transition-all duration-300" />
							</div>
							<div className="flex-1 text-left">
								<div className="font-bold text-lg text-foreground">
									Add Channel
								</div>
								<div className="text-sm text-muted-foreground">
									Connect your first communication platform
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
							<MessageCircle className="h-6 w-6 text-muted-foreground" />
						</div>
						<span className="text-xl font-bold text-foreground">Connected Channels</span>
					</CardTitle>
					<CardDescription className="text-base font-semibold text-muted-foreground">
						You have {channels.length} connected channels.
					</CardDescription>
				</CardHeader>
				<CardContent className="relative">
					{channels.length > 0 ? (
						<div className="space-y-4">
							{channels.map((userChannel, index) => (
								<div
									key={userChannel.id}
									className="group p-5 rounded-xl bg-card border-2 border-border hover:border-accent transition-all duration-300 hover:shadow-lg animate-fade-in hover-scale"
									style={{
										animationDelay: `${index * 0.1}s`,
									}}>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											<div className="p-3 bg-accent group-hover:bg-accent/90 rounded-lg transition-all duration-300">
												{React.cloneElement(
													getChannelIcon(userChannel.channels.id) as React.ReactElement<React.SVGProps<SVGSVGElement>>,
													{
														className: "h-6 w-6 text-accent-foreground group-hover:scale-110 transition-all duration-300",
													}
												)}
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<h3 className="font-bold text-lg capitalize text-foreground group-hover:text-accent transition-colors">
														{userChannel.channels.id}
													</h3>
												</div>
												<p className="text-sm font-medium text-muted-foreground">
													{formatChannelId(
														userChannel.channels.id,
														userChannel.link
													)}
												</p>
												<div className="flex items-center gap-2 mt-2">
													{userChannel.verified_at ? (
														<>
															<CheckCircle className="h-5 w-5 text-success" />
															<Badge variant="success">
																Verified
															</Badge>
														</>
													) : (
														<>
															<AlertCircle className="h-5 w-5 text-warning" />
															<Badge variant="warning">
																Pending verification
															</Badge>
														</>
													)}
												</div>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													handleTestChannel(
														userChannel.id
													)
												}
												disabled={true}
												className="transition-all duration-300 hover:scale-105">
												Test
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
												className="text-destructive hover:text-destructive/80 transition-all duration-300 hover:scale-105">
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
								No channels connected
							</h3>
							<p className="text-muted-foreground mb-6 text-base">
								Connect your first channel to start using AnthonChat
							</p>
							<Button
								onClick={() =>
									router.push("/dashboard/channels/add")
								}
								className="transition-all duration-300 hover:scale-105">
								<Plus className="h-4 w-4 mr-2" />
								Add Your First Channel
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
