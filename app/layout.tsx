import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Qualora  -  Consensus backed data quality governance",
    template: "%s | Qualora",
  },
  description:
    "GenLayer powered data quality governance oracle. Classify missingness, duplication, schema drift, and unsafe fixes with validator consensus before flawed data reaches dashboards or AI systems.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ledger-mist text-control-ink antialiased">
        {children}
      </body>
    </html>
  )
}
