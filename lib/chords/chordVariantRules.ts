const duplicateVariantFiles: Record<string, number[]> = {
  G: [2],
}

export function isDuplicateChordVariant(chordName: string, fileIndex: number) {
  return duplicateVariantFiles[chordName]?.includes(fileIndex) ?? false
}

export function getChordVariantFileIndex(
  chordName: string,
  displayIndex: number
) {
  if (displayIndex <= 1) return 1

  let fileIndex = 2
  let currentDisplayIndex = 2

  while (true) {
    if (isDuplicateChordVariant(chordName, fileIndex)) {
      fileIndex += 1
      continue
    }

    if (currentDisplayIndex === displayIndex) {
      return fileIndex
    }

    currentDisplayIndex += 1
    fileIndex += 1
  }
}
