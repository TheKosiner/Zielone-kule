import { Sprout } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState, PageHeader } from '@/components/ui/Misc'

export function ComingSoon({ title, stage, text }: { title: string; stage: number; text: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={<Sprout className="h-7 w-7" />} title={`Ten moduł powstaje w etapie ${stage}`} text={text} />
      </Card>
    </>
  )
}
