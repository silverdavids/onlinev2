import Link from "next/link";
import { IconDeviceGamepad2 } from "@tabler/icons-react";
import ContentPage from "@/components/Shared/ContentPage";

export default function ProductPage({ product }: { product: string }) {
  return <ContentPage title={product}><div className="smartbet-panel smartbet-empty smartbet-product-empty"><IconDeviceGamepad2 size={48} aria-hidden="true" /><span className="smartbet-badge">Coming soon</span><h2>{product} is coming soon</h2><p>Explore sports and live betting while we get this section ready.</p><div className="smartbet-actions"><Link href="/soccer" className="smartbet-button">Explore sports</Link><Link href="/live-betting">Live betting</Link></div></div></ContentPage>;
}
