'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    // Generate JSON-LD for breadcrumbs
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            item: item.href ? `https://streefi.in${item.href}` : undefined,
        })),
    };

    return (
        <>
            {/* Schema.org Breadcrumb structured data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />

            {/* Visual breadcrumb navigation */}
            <nav
                aria-label="Breadcrumb"
                className={`flex items-center text-sm text-gray-600 py-1 px-1 sm:py-1 sm:px-0 ${className}`}
            >
                <ol className="flex items-center flex-nowrap gap-2 sm:gap-1 overflow-x-auto" itemScope itemType="https://schema.org/BreadcrumbList">
                    {/* Home link */}
                    <li
                        className="flex items-center"
                        itemProp="itemListElement"
                        itemScope
                        itemType="https://schema.org/ListItem"
                    >
                        <Link
                            href="/"
                            className="flex items-center hover:text-[#06c167] transition-colors"
                            itemProp="item"
                        >
                            <Home className="w-4 h-4" />
                            <span className="ml-2 text-sm" itemProp="name">Home</span>
                        </Link>
                        <meta itemProp="position" content="1" />
                    </li>

                    {items.map((item, index) => (
                        <li
                            key={index}
                            className="flex items-center whitespace-nowrap"
                            itemProp="itemListElement"
                            itemScope
                            itemType="https://schema.org/ListItem"
                        >
                            <ChevronRight className="w-4 h-4 mx-1 text-gray-400" aria-hidden="true" />
                            {item.href ? (
                                <Link
                                    href={item.href}
                                    className="inline-flex items-center hover:text-[#06c167] transition-colors"
                                    itemProp="item"
                                >
                                    <span itemProp="name">{item.label}</span>
                                </Link>
                            ) : (
                                <span className="text-gray-900 font-medium" itemProp="name" aria-current="page">
                                    {item.label}
                                </span>
                            )}
                            <meta itemProp="position" content={String(index + 2)} />
                        </li>
                    ))}
                </ol>
            </nav>
        </>
    );
}
