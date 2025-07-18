"use client";

import React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	MessageCircle,
	Phone,
	CheckCircle,
	AlertCircle,
	Plus,
	Link as LinkIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- STEP 1: Define the correct interfaces to match the actual data ---

// This represents the object inside the nested 'channels' array
interface ChannelDetails {
	id: string;
	link_method: string;
	is_active: boolean;
}

// This represents the main object in the props array.
interface UserChannel {
	id: string;
	link: string;
	verified_at: string | null;
	channels: ChannelDetails; // Changed to a single object
}

// The component props
interface ChannelsOverviewProps {
	channels: UserChannel[];
}

export function ChannelsOverview({ channels }: ChannelsOverviewProps) {
	const router = useRouter();

	const getChannelIcon = (channelId: string) => {
		switch (channelId.toLowerCase()) {
			case "whatsapp":
				return <Phone className="h-4 w-4" />;
			case "telegram":
				return <MessageCircle className="h-4 w-4" />;
			default:
				return <LinkIcon className="h-4 w-4" />;
		}
	};

	const formatChannelLink = (channelId: string, link: string) => {
		switch (channelId.toLowerCase()) {
			case "telegram":
				return `@${link}`;
			default:
				return link;
		}
	};

	return (
		<Card className="hover-lift overflow-hidden relative border-2">
			<div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-accent/10 pointer-events-none" />

			<CardHeader className="relative">
				<CardTitle className="flex items-center gap-3">
					<div className="p-3 bg-secondary rounded-lg shadow-lg">
						<MessageCircle className="h-6 w-6 text-secondary-foreground" />
					</div>
					<span className="text-xl font-bold text-foreground">
						Connected Channels
					</span>
				</CardTitle>
				<CardDescription className="text-base font-semibold text-muted-foreground">
					Manage your communication channels
				</CardDescription>
			</CardHeader>
			<CardContent className="relative">
				<div className="space-y-4">
					{channels && channels.length > 0 ? (
						channels.map((userChannel, index) => {
							// Access the nested object directly
							const channelDetails = userChannel.channels;

							// If channel details are missing, skip rendering.
							if (!channelDetails) {
								return null;
							}

							return (
								<div
									key={userChannel.id}
									className="group p-5 rounded-xl bg-card border-2 border-border hover:border-accent transition-all duration-300 hover:shadow-lg animate-fade-in hover-scale"
									style={{
										animationDelay: `${index * 0.1}s`,
									}}>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											<div className="p-3 bg-accent group-hover:bg-accent/90 rounded-lg transition-all duration-300">
												{/* --- STEP 3: Use the correct data properties --- */}
												{React.cloneElement(
													getChannelIcon(
														channelDetails.id
													),
													{
														className:
															"h-6 w-6 text-accent-foreground group-hover:scale-110 transition-all duration-300",
													}
												)}
											</div>
											<div>
												<div className="font-bold text-lg capitalize flex items-center gap-3">
													<span className="text-foreground group-hover:text-accent transition-colors">
														{channelDetails.id}
													</span>
													{/* Logic for 'mandatory' is removed as it doesn't exist on the DB */}
												</div>
												<div className="text-sm font-medium text-muted-foreground mt-1">
													{formatChannelLink(
														channelDetails.id,
														userChannel.link
													)}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-3">
											{/* Use the real `verified_at` property to show the correct status */}
											{userChannel.verified_at ? (
												<>
													<CheckCircle className="h-5 w-5 text-green-500" />
													<Badge variant="success">
														Verified
													</Badge>
												</>
											) : (
												<>
													<AlertCircle className="h-5 w-5 text-yellow-500" />
													<Badge variant="warning">
														Unverified
													</Badge>
												</>
											)}
										</div>
									</div>
								</div>
							);
						})
					) : (
						<div className="text-center py-12 animate-fade-in">
							<div className="p-6 bg-muted rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
								<MessageCircle className="h-10 w-10 text-muted-foreground animate-bounce-subtle" />
							</div>
							<h3 className="text-xl font-bold text-foreground mb-3">
								No channels connected
							</h3>
							<p className="text-base font-medium text-muted-foreground mb-8">
								Connect your first communication channel to get
								started
							</p>
						</div>
					)}
				</div>

				<div className="mt-8 pt-6 border-t border-gradient-to-r from-transparent via-border to-transparent">
					<div className="flex gap-4 w-full">
						<Button
							variant="outline"
							className="flex-1 bg-card border-2 border-secondary hover:bg-secondary/10 text-foreground font-semibold transition-all duration-300 hover:shadow-lg py-3 rounded-xl"
							onClick={() =>
								router.push("/dashboard/channels/add")
							}>
							<Plus className="mr-2 h-4 w-4" />
							Add New Channel
						</Button>
						{channels.length > 0 && (
							<Button
								className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold transition-all duration-300 hover:shadow-lg py-3 rounded-xl"
								onClick={() =>
									router.push("/dashboard/channels")
								}>
								Manage All Channels
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
