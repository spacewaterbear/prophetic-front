import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
    try {
        const filePath = join(process.cwd(), 'public', 'markdown_test.md');
        const content = await readFile(filePath, 'utf-8');

        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    } catch (error) {
        console.error('Error reading markdown file:', error);
        return NextResponse.json(
            { error: 'Failed to read markdown file' },
            { status: 500 }
        );
    }
}
