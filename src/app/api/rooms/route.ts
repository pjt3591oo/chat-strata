import { connection } from "next/server";
import { listRooms } from "@/lib/chat-store";

// cacheComponents is enabled: GET handlers can be prerendered when they touch
// no runtime data. This one reads mutable in-memory state, so defer to
// request time with connection() to always serve the live roster.
export async function GET(): Promise<Response> {
  await connection();
  return Response.json({ rooms: listRooms() });
}
