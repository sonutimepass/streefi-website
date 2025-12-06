import Script from 'next/script';
import { WithContext, Thing } from 'schema-dts';

export function JsonLd<T extends Thing>({ id, schema }: { id: string; schema: WithContext<T> }) {
    return (
        <Script
            id={id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(schema),
            }}
        />
    );
}
