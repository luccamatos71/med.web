'use client'

import { useParams } from 'next/navigation'

import { FlashcardEditor } from '@/components/flashcard/FlashcardEditor'

export default function EditFlashcardPage() {
  const params = useParams()
  const flashcardId = params.id as string
  return <FlashcardEditor flashcardId={flashcardId} />
}
