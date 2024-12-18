import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT = 768 // md breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" 
      ? window.innerWidth < MOBILE_BREAKPOINT 
      : false
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Add event listener
    window.addEventListener("resize", handleResize)
    
    // Call handler right away so state gets updated with initial window size
    handleResize()

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isMobile
}
