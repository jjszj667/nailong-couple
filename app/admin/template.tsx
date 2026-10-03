import { RouteTransition } from "@/components/motion/route-transition";
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
