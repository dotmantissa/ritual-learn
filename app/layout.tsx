export const metadata = {
  title: 'Ritual | Learn',
  description: 'Education Hub for Ritual',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
