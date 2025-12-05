"use client";

import { RealEstateCard, RealEstateData } from "@/components/RealEstateCard";

const sampleData: RealEstateData = {
    found: true,
    marketplace: "james_edition",
    location: "Paris",
    location_slug: "paris",
    total_properties: 10,
    search_url: "https://www.jamesedition.com/real_estate/paris-france",
    properties: [
        {
            title: "Luxury Apartment in 16th Arrondissement",
            price: "€2,500,000",
            price_amount: 2500000,
            price_currency: "EUR",
            url: "https://example.com/1",
            image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1000&auto=format&fit=crop",
            bedrooms: 3,
            bathrooms: 2,
            square_meters: 150,
            property_type: "Apartment",
            listing_id: "1"
        },
        {
            title: "Historic Mansion near Eiffel Tower",
            price: "€8,900,000",
            price_amount: 8900000,
            price_currency: "EUR",
            url: "https://example.com/2",
            image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1000&auto=format&fit=crop",
            bedrooms: 6,
            bathrooms: 5,
            square_meters: 450,
            property_type: "Mansion",
            listing_id: "2"
        },
        {
            title: "Modern Penthouse with City Views",
            price: "€4,200,000",
            price_amount: 4200000,
            price_currency: "EUR",
            url: "https://example.com/3",
            image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop",
            bedrooms: 4,
            bathrooms: 3,
            square_meters: 220,
            property_type: "Penthouse",
            listing_id: "3"
        },
        {
            title: "Charming Studio in Le Marais",
            price: "€650,000",
            price_amount: 650000,
            price_currency: "EUR",
            url: "https://example.com/4",
            image_url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1000&auto=format&fit=crop",
            bedrooms: 1,
            bathrooms: 1,
            square_meters: 45,
            property_type: "Apartment",
            listing_id: "4"
        },
        {
            title: "Elegant Townhouse in Saint-Germain",
            price: "€5,500,000",
            price_amount: 5500000,
            price_currency: "EUR",
            url: "https://example.com/5",
            image_url: "https://images.unsplash.com/photo-1600596542815-2a4d9f6fac90?q=80&w=1000&auto=format&fit=crop",
            bedrooms: 5,
            bathrooms: 4,
            square_meters: 300,
            property_type: "Townhouse",
            listing_id: "5"
        },
        {
            title: "Exclusive Villa with Private Garden",
            price: "€12,000,000",
            price_amount: 12000000,
            price_currency: "EUR",
            url: "https://example.com/6",
            image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1000&auto=format&fit=crop",
            bedrooms: 8,
            bathrooms: 7,
            square_meters: 800,
            property_type: "Villa",
            listing_id: "6"
        }
    ]
};

export default function TestRealEstatePage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
                    Real Estate Card Component Test
                </h1>
                <RealEstateCard data={sampleData} />
            </div>
        </div>
    );
}
