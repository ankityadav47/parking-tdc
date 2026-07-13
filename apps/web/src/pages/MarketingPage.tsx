import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

type MarketingPageProps = {
    title: string;
    description: string;
    ctaLabel?: string;
    ctaTo?: string;
    items?: string[];
};

export default function MarketingPage({ title, description, ctaLabel = 'Find Parking', ctaTo = '/search', items = [] }: MarketingPageProps) {
    const isExternalCta = /^https?:\/\//.test(ctaTo);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <Header />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <div className="max-w-3xl space-y-6">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">{title}</h1>
                    <p className="text-lg text-slate-600 leading-relaxed">{description}</p>
                    {isExternalCta ? (
                        <a
                            href={ctaTo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
                        >
                            {ctaLabel}
                        </a>
                    ) : (
                        <Link
                            to={ctaTo}
                            className="inline-flex bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
                        >
                            {ctaLabel}
                        </Link>
                    )}
                </div>

                {items.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
                        {items.map((item) => (
                            <Link
                                key={item}
                                to={`/search?address=${encodeURIComponent(item)}`}
                                className="border border-slate-200 rounded-2xl p-5 bg-white hover:shadow-md transition-shadow text-blue-600 font-semibold"
                            >
                                {item}
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
