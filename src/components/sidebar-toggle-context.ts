"use client";

import { createContext, useContext } from "react";

export type SidebarToggle = { collapsed: boolean; toggle: () => void };

export const SidebarToggleContext = createContext<SidebarToggle | null>(null);
export const useSidebarToggle = () => useContext(SidebarToggleContext);
