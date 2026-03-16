import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
        <body>
            <Script
                src="https://accounts.google.com/gsi/client"
    strategy="afterInteractive"
        />
        {children}
        </body>
        </html>
);
}
