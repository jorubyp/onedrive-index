import type { NextApiRequest, NextApiResponse } from "next";
import { setShortPath } from "../../utils/shortPathStore";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const url = req.body.url;
  const short = await setShortPath(url);

  res.status(200).json({ url, short });
}