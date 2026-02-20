import { useRef, useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';

interface ChartExportButtonProps {
    targetId: string;
    filename?: string;
}

export function ChartExportButton({ targetId, filename }: ChartExportButtonProps) {
    const [exporting, setExporting] = useState(false);
    const linkRef = useRef<HTMLAnchorElement>(null);

    const handleExport = useCallback(async () => {
        const node = document.getElementById(targetId);
        if (!node) return;

        setExporting(true);
        try {
            const dataUrl = await toPng(node, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
            });

            const name = filename || `${targetId}-${new Date().toISOString().slice(0, 10)}`;
            const link = linkRef.current;
            if (link) {
                link.download = `${name}.png`;
                link.href = dataUrl;
                link.click();
            }
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    }, [targetId, filename]);

    return (
        <>
            <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                title="Export as PNG"
            >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting…' : 'Export'}
            </button>
            {/* Hidden link used to trigger download */}
            <a ref={linkRef} className="hidden" aria-hidden="true" />
        </>
    );
}
