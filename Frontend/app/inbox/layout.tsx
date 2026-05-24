import { CampaignProvider } from './CampaignContext'

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CampaignProvider>
      {children}
    </CampaignProvider>
  )
}
