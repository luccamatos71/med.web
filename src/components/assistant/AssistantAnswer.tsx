'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { CitedChunk } from '@/types/chat'

const body: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.9375rem',
  lineHeight: 1.7,
  color: 'var(--base-ink)',
}

/** Renders an assistant message as styled markdown plus clickable sources. */
export function AssistantAnswer({
  text,
  sources,
}: {
  text: string
  sources: CitedChunk[]
}) {
  return (
    <div>
      <div style={body}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p style={{ margin: '0 0 0.7em' }}>{children}</p>,
            strong: ({ children }) => (
              <strong style={{ fontWeight: 600, color: 'var(--base-ink)' }}>{children}</strong>
            ),
            em: ({ children }) => <em>{children}</em>,
            ul: ({ children }) => (
              <ul style={{ margin: '0 0 0.7em', paddingLeft: '1.2em' }}>{children}</ul>
            ),
            ol: ({ children }) => (
              <ol style={{ margin: '0 0 0.7em', paddingLeft: '1.2em' }}>{children}</ol>
            ),
            li: ({ children }) => <li style={{ marginBottom: '0.3em' }}>{children}</li>,
            h1: ({ children }) => <h3 style={headingStyle(1.25)}>{children}</h3>,
            h2: ({ children }) => <h3 style={headingStyle(1.15)}>{children}</h3>,
            h3: ({ children }) => <h4 style={headingStyle(1.05)}>{children}</h4>,
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--teal-strong)', textDecoration: 'underline' }}
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote
                style={{
                  margin: '0 0 0.7em',
                  padding: '0.4em 0.9em',
                  borderLeft: '3px solid var(--teal-main)',
                  backgroundColor: 'var(--teal-wash)',
                  borderRadius: '0 6px 6px 0',
                  fontStyle: 'italic',
                }}
              >
                {children}
              </blockquote>
            ),
            code: ({ className, children }) => {
              const inline = !className
              if (inline) {
                return (
                  <code
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.85em',
                      backgroundColor: 'var(--base-canvas)',
                      padding: '0.1em 0.35em',
                      borderRadius: 4,
                      border: '1px solid var(--base-edge)',
                    }}
                  >
                    {children}
                  </code>
                )
              }
              return (
                <code
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '0.85em',
                    display: 'block',
                  }}
                >
                  {children}
                </code>
              )
            },
            pre: ({ children }) => (
              <pre
                style={{
                  margin: '0 0 0.7em',
                  padding: '0.8em',
                  backgroundColor: 'var(--base-canvas)',
                  border: '1px solid var(--base-edge)',
                  borderRadius: 'var(--radius-m)',
                  overflowX: 'auto',
                }}
              >
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '0 0 0.7em' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.875rem' }}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th
                style={{
                  border: '1px solid var(--base-edge)',
                  padding: '6px 10px',
                  textAlign: 'left',
                  backgroundColor: 'var(--teal-wash)',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                }}
              >
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td style={{ border: '1px solid var(--base-edge)', padding: '6px 10px' }}>
                {children}
              </td>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>

      {sources.length > 0 && <SourceList sources={sources} />}
    </div>
  )
}

function headingStyle(em: number): CSSProperties {
  return {
    fontFamily: 'var(--font-display)',
    fontSize: `${em}rem`,
    fontWeight: 400,
    color: 'var(--base-ink)',
    margin: '0.4em 0 0.4em',
    lineHeight: 1.3,
  }
}

function SourceList({ sources }: { sources: CitedChunk[] }) {
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--base-edge)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
      }}
    >
      {sources.map((source, index) => {
        const label = `${source.material_title}${source.page_number ? ` · p.${source.page_number}` : ''}`
        const canLink = source.subject_id && source.topic_id && source.material_id
        const chipStyle: CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 'var(--radius-round)',
          border: '1px solid var(--teal-soft)',
          backgroundColor: 'var(--teal-wash)',
          fontFamily: 'var(--font-ui)',
          fontSize: '0.6875rem',
          color: 'var(--teal-strong)',
          textDecoration: 'none',
        }
        if (canLink) {
          return (
            <Link
              key={`${source.chunk_id}-${index}`}
              href={{
                pathname: `/subjects/${source.subject_id}/topics/${source.topic_id}/materials/${source.material_id}`,
                query: source.page_number ? { page: source.page_number } : undefined,
              }}
              style={chipStyle}
            >
              {label}
            </Link>
          )
        }
        return (
          <span key={`${source.chunk_id}-${index}`} style={chipStyle}>
            {label}
          </span>
        )
      })}
    </div>
  )
}
