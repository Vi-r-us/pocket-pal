import { GridItem } from "@/components/layout/GridItem"
import { Panel } from "@/components/layout/Panel"

type PagePlaceholderProps = {
  description: string
}

export const PagePlaceholder = ({ description }: PagePlaceholderProps) => {
  return (
    <GridItem span={12}>
      <Panel description={description} />
    </GridItem>
  )
}
