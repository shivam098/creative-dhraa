"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";

interface Template {
  id: string;
  name: string;
  previewUrl: string;
}

interface TemplatePickerProps {
  templates: Template[];
  selectedId: string | null;
  onSelect: (template: Template) => void;
}

export default function TemplatePicker({
  templates,
  selectedId,
  onSelect,
}: TemplatePickerProps) {
  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Choose a Design Template</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-border hover:border-accent/50"
              }`}
            >
              <div className="relative aspect-square">
                <Image
                  src={template.previewUrl}
                  alt={template.name}
                  fill
                  className="object-cover"
                  sizes="150px"
                />
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-accent/20"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-background">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                  </motion.div>
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-center text-foreground truncate">
                  {template.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
