import GuitarTunerPage, { guitarTunerMetadata } from "@/app/components/GuitarTunerPage"

export const metadata = guitarTunerMetadata("sr")

export default function Page() {
  return <GuitarTunerPage locale="sr" />
}
