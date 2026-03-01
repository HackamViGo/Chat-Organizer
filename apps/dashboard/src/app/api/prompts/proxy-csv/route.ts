import { NextResponse } from 'next/server'

const GITHUB_RAW_URL =
  'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv'

export async function GET() {
  try {
    const response = await fetch(GITHUB_RAW_URL, {
      headers: {
        Accept: 'text/csv',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch CSV: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const csvText = await response.text()

    return new NextResponse(csvText, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error: unknown) {
    console.error('Proxy CSV error:', error)
    return NextResponse.json({ error: 'Failed to proxy CSV file' }, { status: 500 })
  }
}
