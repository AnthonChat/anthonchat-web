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
	RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useChannels } from "@/hooks/useChannels";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingWrapper } from "@/components/ui/loading";
import { UserChannelWithChannel } from "@/lib/types/channels";

// The component props
interface ChannelsOverviewProps {
	userId: string;
}

// Memoized channel item component for better performance
const ChannelItem = React.memo(({ 
	userChannel, 
	index, 
	getChannelIcon, 
	formatChannelLink,
	onChannelClick
}: {
	userChannel: UserChannelWithChannel;
	index: number;
	getChannelIcon: (channelId: string) => React.ReactElement;
	formatChannelLink: (channelId: string, link: string) => string;
	onChannelClick: (userChannel: UserChannelWithChannel) => void;
}) => {
	const channelDetails = userChannel.channels;

	// If channel details are missing, skip rendering.
	if (!channelDetails) {
		return null;
	}

	const isVerified = !!userChannel.verified_at;

	return (
		<Button
			key={userChannel.id}
			variant="outline"
			className="w-full justify-start h-auto p-5 transition-all duration-300 group border-2 bg-card hover:bg-accent border-border hover:border-accent text-foreground"
			onClick={() => onChannelClick(userChannel)}
			style={{
				animationDelay: `${index * 0.1}s`,
			}}>
			<div className="flex items-center justify-between w-full">
				<div className="flex items-center gap-4">
					<div className="p-3 bg-accent group-hover:bg-accent rounded-lg transition-all duration-300">
						{React.cloneElement(
							getChannelIcon(channelDetails.id) as React.ReactElement<React.SVGProps<SVGSVGElement>>,
							{
								className:
									"h-6 w-6 text-accent-foreground group-hover:scale-110 transition-all duration-300",
							}
						)}
					</div>
					<div className="flex-1 text-left">
						<div className="font-bold text-lg capitalize transition-all duration-300 text-foreground group-hover:text-accent-foreground">
							{channelDetails.id}
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
					{isVerified ? (
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
								Unverified
							</Badge>
						</>
					)}
				</div>
			</div>
		</Button>
	);
});

ChannelItem.displayName = "ChannelItem";

// Loading skeleton for channels
// Main component content
function ChannelsOverviewContent({ userId }: ChannelsOverviewProps) {
	const router = useRouter();
	
	// Use the channels hook for real-time updates
	const {
		channels,
		isLoading,
		error,
		refetch,
	} = useChannels({
		userId,
		enableRealtime: true,
	});

	const getChannelIcon = React.useCallback((channelId: string): React.ReactElement => {
		switch (channelId.toLowerCase()) {
			case "whatsapp":
				return <Phone className="h-4 w-4" />;
			case "telegram":
				return <MessageCircle className="h-4 w-4" />;
			default:
				return <LinkIcon className="h-4 w-4" />;
		}
	}, []);

	const formatChannelLink = React.useCallback((channelId: string, link: string) => {
		switch (channelId.toLowerCase()) {
			case "telegram":
				return `@${link}`;
			default:
				return link;
		}
	}, []);

	const handleAddChannel = React.useCallback(() => {
		router.push("/dashboard/channels/add");
	}, [router]);

	const handleManageChannels = React.useCallback(() => {
		router.push("/dashboard/channels");
	}, [router]);

	const handleChannelClick = React.useCallback((userChannel: UserChannelWithChannel) => {
		// Navigate to channel management page with specific channel
		router.push(`/dashboard/channels/${userChannel.id}`);
	}, [router]);

	// Show error state if there's an error and no cached data
	if (error && !channels.length) {
		return (
			<Card className="border-destructive/50">
				<CardContent className="p-6">
					<div className="flex items-center gap-3 text-destructive">
						<AlertCircle className="h-5 w-5" />
						<div>
							<p className="font-medium">Failed to load channels</p>
							<p className="text-sm text-muted-foreground">
								{error}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={refetch}
							className="ml-auto"
						>
							<RefreshCw className="h-4 w-4 mr-2" />
							Retry
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="hover-lift overflow-hidden relative border-2">
			<div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/10 pointer-events-none" />

			<CardHeader className="relative">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-3">
						<div className="p-3 bg-muted rounded-lg shadow-lg">
							<MessageCircle className="h-6 w-6 text-muted-foreground" />
						</div>
						<span className="text-xl font-bold text-foreground">
							Connected Channels
						</span>
					</CardTitle>
					{/* Realtime status indicators <rem></rem>oved */}
				</div>
				<CardDescription className="text-base font-semibold text-muted-foreground mt-2">
					Manage your communication channels
				</CardDescription>
			</CardHeader>
			
			<CardContent className="relative">
				<LoadingWrapper
					isLoading={isLoading && !channels.length}
					skeleton={<div className="space-y-4">
						{[...Array(2)].map((_, i) => (
							<div key={i} className="p-5 rounded-xl bg-card border-2 border-border">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-4">
										<Skeleton className="w-12 h-12 rounded-lg" />
										<div className="space-y-2">
											<Skeleton className="w-24 h-5" />
											<Skeleton className="w-32 h-4" />
										</div>
									</div>
									<div className="flex items-center gap-3">
										<Skeleton className="w-5 h-5 rounded-full" />
										<Skeleton className="w-16 h-6 rounded-full" />
									</div>
								</div>
							</div>
						))}
					</div>}
				>
					<div className="grid grid-cols-1 gap-3">
						{channels && channels.length > 0 ? (
							channels.map((userChannel, index) => (
								<ChannelItem
									key={userChannel.id}
									userChannel={userChannel}
									index={index}
									getChannelIcon={getChannelIcon}
									formatChannelLink={formatChannelLink}
									onChannelClick={handleChannelClick}
								/>
							))
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
				</LoadingWrapper>

				<div className="mt-8 pt-6 border-t border-border/50">
					<div className="flex gap-4 w-full">
						<Button
							variant="outline"
							className="flex-1 bg-card hover:bg-accent border-2 border-border hover:border-accent text-foreground font-semibold transition-all duration-300 hover:shadow-lg py-3 rounded-xl"
							onClick={handleAddChannel}
							disabled={isLoading}
						>
							<Plus className="mr-2 h-4 w-4" />
							Add New Channel
						</Button>
						{channels.length > 0 && (
							<Button
								variant="default"
								className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground border-primary font-semibold transition-all duration-300 hover:shadow-lg py-3 rounded-xl"
								onClick={handleManageChannels}
								disabled={isLoading}
							>
								Manage All Channels
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// Export the component wrapped with error boundary
export const ChannelsOverview = React.memo(function ChannelsOverview(props: ChannelsOverviewProps) {
	return (
		<ErrorBoundary
			fallback={
				<Card className="border-destructive/50">
					<CardContent className="p-6">
						<div className="flex items-center gap-3 text-destructive">
							<AlertCircle className="h-5 w-5" />
							<div>
								<p className="font-medium">Failed to load channels overview</p>
								<p className="text-sm text-muted-foreground">
									Please refresh the page or contact support if the problem persists.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			}
		>
			<ChannelsOverviewContent {...props} />
		</ErrorBoundary>
	);
});
