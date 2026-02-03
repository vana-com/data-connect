export interface MockApp {
  id: string
  name: string
  description: string
  icon: string
  category: string
  status: "live" | "coming-soon"
  dataRequired: string[]
}
