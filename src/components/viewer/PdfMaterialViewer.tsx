'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Skeleton } from '@/components/ui/skeleton'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const API = process.env.NEXT_PUBLIC_API_URL

interface PdfMaterialViewerProps {
  materialId: string
  title: string
  pdfUrl: string
  accessToken: string
  initialPage?: number
}

interface TextItem {
  str: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function PdfMaterialViewer({
  materialId,
  title,
  pdfUrl,
  accessToken,
  initialPage,
}: PdfMaterialViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(() => Math.max(1, initialPage ?? 1))
  const [scale, setScale] = useState(1)
  const [query, setQuery] = useState('')
  const [pageTexts, setPageTexts] = useState<Record<number, string>>({})
  const [pdfError, setPdfError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const matchedPages = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []

    return Object.entries(pageTexts)
      .filter(([, text]) => text.toLowerCase().includes(normalized))
      .map(([page]) => Number(page))
      .sort((a, b) => a - b)
  }, [pageTexts, query])

  useEffect(() => {
    if (!numPages) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      fetch(`${API}/api/v1/materials/${materialId}/read-position`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ position_data: { page: pageNumber } }),
      }).catch(() => {
        // Read position is best-effort and should not block reading.
      })
    }, 500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [accessToken, materialId, numPages, pageNumber])

  async function handleDocumentLoadSuccess(pdf: PDFDocumentProxy) {
    setPdfError(null)
    setNumPages(pdf.numPages)
    setPageNumber(clamp(initialPage ?? pageNumber, 1, pdf.numPages))

    const textEntries = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, index) => {
        const page = await pdf.getPage(index + 1)
        const textContent = await page.getTextContent()
        const text = textContent.items
          .map(item => ('str' in item ? (item as TextItem).str : ''))
          .join(' ')
        return [index + 1, text] as const
      }),
    )

    setPageTexts(Object.fromEntries(textEntries))
  }

  function goToNextMatch() {
    if (matchedPages.length === 0) return
    const next = matchedPages.find(page => page > pageNumber) ?? matchedPages[0]
    setPageNumber(next)
  }

  function goToPreviousMatch() {
    if (matchedPages.length === 0) return
    const previous = [...matchedPages].reverse().find(page => page < pageNumber) ?? matchedPages[matchedPages.length - 1]
    setPageNumber(previous)
  }

  const searchPattern = query.trim() ? new RegExp(`(${escapeRegExp(query.trim())})`, 'gi') : null

  return (
    <div>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.75rem',
        fontWeight: 400,
        color: 'var(--base-ink)',
        margin: '0 0 16px',
      }}>
        {title}
      </h1>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
          background: 'var(--base-surface)',
          border: '1px solid var(--base-edge)',
          borderRadius: 'var(--radius-m)',
          padding: '8px 10px',
        }}>
          <Search size={16} strokeWidth={1.25} color="var(--base-whisper)" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Buscar no PDF"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--font-ui)',
              fontSize: '0.8125rem',
              color: 'var(--base-ink)',
            }}
          />
          {query && (
            <button
              type="button"
              aria-label="Limpar busca"
              title="Limpar busca"
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--base-whisper)', cursor: 'pointer', display: 'flex', padding: 2 }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <button type="button" onClick={goToPreviousMatch} disabled={matchedPages.length === 0} title="Resultado anterior" style={iconButtonStyle(matchedPages.length > 0)}>
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
        <button type="button" onClick={goToNextMatch} disabled={matchedPages.length === 0} title="Próximo resultado" style={iconButtonStyle(matchedPages.length > 0)}>
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.75rem', color: 'var(--base-whisper)', minWidth: 76 }}>
          {query.trim() ? `${matchedPages.length} páginas` : ''}
        </span>
      </div>

      {pdfError ? (
        <p style={{ color: 'var(--terracotta-strong)', fontFamily: 'var(--font-ui)', fontSize: '0.9375rem' }}>
          {pdfError}
        </p>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          minHeight: '70vh',
          paddingBottom: 72,
        }}>
          <Document
            file={pdfUrl}
            loading={<Skeleton style={{ height: '70vh', width: '100%' }} />}
            error="Não foi possível carregar o PDF."
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={() => setPdfError('Não foi possível carregar o PDF.')}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer
              renderAnnotationLayer
              loading={<Skeleton style={{ height: '70vh', width: 640 }} />}
              customTextRenderer={({ str }) => {
                const escaped = escapeHtml(str)
                if (!searchPattern) return escaped
                return escaped.replace(searchPattern, '<mark style="background:#FDE68A;color:#1C1917">$1</mark>')
              }}
            />
          </Document>
        </div>
      )}

      <div style={{
        position: 'sticky',
        bottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '10px 12px',
        margin: '0 auto',
        width: 'fit-content',
        background: 'var(--base-surface)',
        border: '1px solid var(--base-edge)',
        borderRadius: 'var(--radius-m)',
        boxShadow: 'var(--shadow-lift)',
        zIndex: 5,
      }}>
        <button type="button" onClick={() => setPageNumber(page => Math.max(1, page - 1))} disabled={pageNumber <= 1} title="Página anterior" style={iconButtonStyle(pageNumber > 1)}>
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-ink)', minWidth: 96, textAlign: 'center' }}>
          {pageNumber} / {numPages ?? '-'}
        </span>
        <button type="button" onClick={() => setPageNumber(page => numPages ? Math.min(numPages, page + 1) : page)} disabled={!numPages || pageNumber >= numPages} title="Próxima página" style={iconButtonStyle(Boolean(numPages && pageNumber < numPages))}>
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
        <button type="button" onClick={() => setScale(value => Math.max(0.7, Number((value - 0.1).toFixed(2))))} title="Diminuir zoom" style={iconButtonStyle(true)}>
          <ZoomOut size={18} strokeWidth={1.5} />
        </button>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '0.8125rem', color: 'var(--base-whisper)', minWidth: 44, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </span>
        <button type="button" onClick={() => setScale(value => Math.min(2, Number((value + 0.1).toFixed(2))))} title="Aumentar zoom" style={iconButtonStyle(true)}>
          <ZoomIn size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

function iconButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--base-edge)',
    borderRadius: 'var(--radius-m)',
    background: 'var(--base-surface)',
    color: enabled ? 'var(--base-ink)' : 'var(--base-mute)',
    cursor: enabled ? 'pointer' : 'not-allowed',
  }
}
