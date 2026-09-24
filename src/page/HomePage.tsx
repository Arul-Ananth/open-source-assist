import { Layout } from '@/components/layout'
import {
  Hero,
  ProjectFinder,
  Features,
  HowItWorks,
  Community,
  FinalCta,
} from '@/components/sections'

export function HomePage() {
  return (
    <Layout>
      <Hero />
      <ProjectFinder />
      <Features />
      <HowItWorks />
      <Community />
      <FinalCta />
    </Layout>
  )
}

export default HomePage

