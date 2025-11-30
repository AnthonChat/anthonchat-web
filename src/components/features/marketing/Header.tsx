"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { LocaleLink } from "@/components/ui/locale-link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
	const t = useTranslations();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const navLinks = [
		{ href: "#features", label: t("marketing.header.nav.features") },
		{ href: "#how-it-works", label: t("marketing.header.nav.howItWorks") },
		{ href: "/pricing", label: t("marketing.header.nav.pricing") },
	];

	return (
		<motion.header
			initial={{ y: -100 }}
			animate={{ y: 0 }}
			transition={{ type: "spring", stiffness: 100, damping: 20 }}
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
				isScrolled
					? "bg-background/80 backdrop-blur-lg border-b border-border shadow-sm"
					: "bg-transparent"
			}`}>
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between h-16 md:h-20">
					{/* Logo */}
					<LocaleLink
						href="/"
						className="flex items-center gap-2 group">
						<motion.span
							whileHover={{ scale: 1.05 }}
							className="text-xl md:text-2xl font-extrabold tracking-tight text-primary">
							ANTHON
						</motion.span>
					</LocaleLink>

					{/* Desktop Navigation */}
					<nav className="hidden md:flex items-center gap-8">
						{navLinks.map((link) => (
							<LocaleLink
								key={link.href}
								href={link.href}
								className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
								{link.label}
							</LocaleLink>
						))}
					</nav>

					{/* Desktop CTAs */}
					<div className="hidden md:flex items-center gap-4">
						<LocaleLink href="/login">
							<Button variant="ghost" size="sm">
								{t("common.actions.signIn")}
							</Button>
						</LocaleLink>
						<LocaleLink href="/signup">
							<Button size="sm" className="hover-lift">
								{t("common.actions.signUp")}
							</Button>
						</LocaleLink>
					</div>

					{/* Mobile Menu */}
					<Sheet
						open={isMobileMenuOpen}
						onOpenChange={setIsMobileMenuOpen}>
						<SheetTrigger asChild className="md:hidden">
							<Button variant="ghost" size="icon">
								<Menu className="h-5 w-5" />
								<span className="sr-only">
									{t("common.actions.toggleMenu")}
								</span>
							</Button>
						</SheetTrigger>
						<SheetContent
							side="right"
							className="w-[300px] sm:w-[350px]">
							<nav className="flex flex-col gap-6 mt-8">
								{navLinks.map((link) => (
									<LocaleLink
										key={link.href}
										href={link.href}
										onClick={() =>
											setIsMobileMenuOpen(false)
										}
										className="text-lg font-medium text-foreground hover:text-primary transition-colors">
										{link.label}
									</LocaleLink>
								))}
								<div className="border-t border-border pt-6 mt-2 flex flex-col gap-3">
									<LocaleLink
										href="/login"
										onClick={() =>
											setIsMobileMenuOpen(false)
										}>
										<Button
											variant="outline"
											className="w-full">
											{t("common.actions.signIn")}
										</Button>
									</LocaleLink>
									<LocaleLink
										href="/signup"
										onClick={() =>
											setIsMobileMenuOpen(false)
										}>
										<Button className="w-full">
											{t("common.actions.signUp")}
										</Button>
									</LocaleLink>
								</div>
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</motion.header>
	);
}
