import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"렛츠런파크 통합 예약",description:"서울·부산·제주 승마체험과 투어 통합 예약 서비스"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
