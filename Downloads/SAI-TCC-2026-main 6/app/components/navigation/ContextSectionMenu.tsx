'use client';

import { useMemo, useState } from 'react';
import ContextSectionItem from './ContextSectionItem';

interface ContextSectionMenuProps {
  title: string;
  sections: string[];
  selectedSection?: string;
  onSelectSection?: (section: string) => void;
}

export default function ContextSectionMenu({ title, sections, selectedSection, onSelectSection }: ContextSectionMenuProps) {
    const [internalSelectedSection, setInternalSelectedSection] = useState(sections[0] ?? '');
    const activeSection = selectedSection ?? internalSelectedSection;

    const orderedSections = useMemo(() => {
        if (!activeSection) return sections;
        return [
            activeSection,
            ...sections.filter((section) => section !== activeSection),
        ];
    }, [activeSection, sections]);

    return (
        <aside className="sa-surface-context rounded-2xl border-8 border-orange-500 p-4 backdrop-blur-sm lg:sticky lg:top-0 lg:h-fit">
            <p className="mb-4 text-xl font-semibold uppercase tracking-[0.2em] text-white">
                {title}
            </p>
            <ul className="space-y-2">
                {orderedSections.map((section, index) => (
                    <ContextSectionItem
                        key={section}
                        label={section}
                        isActive={index === 0}
                        onSelect={() => {
                            onSelectSection?.(section);
                            if (!onSelectSection) {
                                setInternalSelectedSection(section);
                            }
                        }}
                    />
                ))}
            </ul>
        </aside>
    );
}
