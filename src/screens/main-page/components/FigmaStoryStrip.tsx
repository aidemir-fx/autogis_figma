import React, { useState } from "react";
import { IMAGES } from "../../../assets/images";
import { StoryViewer } from "@modules/stories/components/StoryViewer";
import { Story } from "@modules/stories/api";

interface StoryItem {
    id: string;
    label: string;
    fullTitle: string;
    image: string;
    isUnviewed: boolean;
    story: Story;
}

export const FigmaStoryStrip: React.FC = () => {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

    const figmaStories: StoryItem[] = [];

    if (figmaStories.length === 0) {
        return null;
    }

    const storyGroups = figmaStories.map((item) => [item.story]);

    const handleStoryClick = (index: number) => {
        setSelectedStoryIndex(index);
        setViewerOpen(true);
    };

    return (
        <>
            <div
                style={{
                    height: 75,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    overflowX: "auto",
                    padding: "0 16px",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                {figmaStories.map((item, idx) => (
                    <div
                        key={item.id}
                        onClick={() => handleStoryClick(idx)}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: 60,
                            minWidth: 60,
                            cursor: "pointer",
                            flexShrink: 0,
                        }}
                    >
                        {/* Rounded square outer ring (54x54) */}
                        <div
                            style={{
                                width: 54,
                                height: 54,
                                borderRadius: 14,
                                padding: 2,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: item.isUnviewed
                                    ? "conic-gradient(from 45deg, #2563EB, #60A5FA, #3B82F6, #93C5FD, #2563EB)"
                                    : "#CBD5E1",
                                boxSizing: "border-box",
                                transition: "transform 0.15s ease",
                            }}
                        >
                            <img
                                src={item.image}
                                alt={item.fullTitle}
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 11,
                                    objectFit: "cover",
                                    border: "2px solid #FFFFFF",
                                    backgroundColor: "#F1F5F9",
                                }}
                            />
                        </div>

                        {/* Label (12px Manrope Medium) */}
                        <span
                            title={item.fullTitle}
                            style={{
                                fontSize: 11,
                                fontWeight: 500,
                                color: "#1E293B",
                                marginTop: 4,
                                textAlign: "center",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 58,
                                lineHeight: "1.2",
                            }}
                        >
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>

            {viewerOpen && (
                <StoryViewer
                    groups={storyGroups}
                    initialGroupIndex={selectedStoryIndex}
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                />
            )}
        </>
    );
};
