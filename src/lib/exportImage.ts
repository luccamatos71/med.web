import { toPng } from 'html-to-image'

/** Export a DOM node as a downloadable PNG (branded background). */
export async function exportNodeAsPng(node: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: '#F9F5F0',
    cacheBust: true,
  })
  const link = document.createElement('a')
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`
  link.href = dataUrl
  link.click()
}
