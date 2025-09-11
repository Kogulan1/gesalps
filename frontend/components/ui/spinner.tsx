"use client";
import React from "react";

export default function Spinner({ size=16 }: { size?: number }){
  const s = size;
  return (
    <span
      className="inline-block align-middle animate-spin rounded-full border-2 border-gray-300 border-t-gray-500"
      style={{ width: s, height: s }}
      aria-label="Loading"
    />
  );
}

