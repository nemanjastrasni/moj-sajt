import GuitarTunerPage, { guitarTunerMetadata } from "@/app/components/GuitarTunerPage"

export const metadata = guitarTunerMetadata("en")

export default function Page() {
  return <GuitarTunerPage locale="en" />
}
