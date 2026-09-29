import { useEffect, useState } from "react";

export function isLebanonTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Beirut";
  } catch {
    return false;
  }
}

export function useIsLebanon(country?: string | null) {
  const [isLebanon, setIsLebanon] = useState(false);

  useEffect(() => {
    setIsLebanon(
      country?.toUpperCase() === "LB" ||
        isLebanonTimeZone() ||
        navigator.language.toUpperCase().endsWith("-LB"),
    );
  }, [country]);

  return isLebanon;
}