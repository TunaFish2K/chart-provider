interface SiteInfo {
  name: string;
  description: string;
  channels: string[];
}

interface ChannelInfo {
  name: string;
  description: string;
  charts: string[];
}

interface ChartInfo {
  name: string;
  level: string;
  difficulty: number;
  charter: string;
  composer: string;
  illustrator: string;
  description: string;
}

interface Chart {
  id: string;
  name: string;
  level: string;
  difficulty: number;
  charter: string;
  composer: string;
  illustrator: string;
  description: string;
  illustration: string;
  preview: string;
  file: string;
}

interface SearchParams {
  page?: number;
  pageNum?: number;
}

export default {
  async fetch(
    request: Request,
    env: {
      staticURL: string;
      proxy: string;
    },
    ctx: ExecutionContext
  ): Promise<Response> {
    const proxy = env.proxy == "true";

    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // 处理根路径 - 获取站点信息
    if (pathname === "/" || pathname === "") {
      try {
        const siteResponse = await fetch(`${env.staticURL}/repository.json`);
        if (!siteResponse.ok) {
          return Response.json({ error: "Site not found" }, { status: 404 });
        }

        const siteData: SiteInfo = await siteResponse.json();

        const response = {
          name: siteData.name,
          description: siteData.description,
          channels: siteData.channels.map(
            (channel) =>
              `${url.origin || request.url.replace(/\/$/, "")}/${channel}`
          ),
        };

        return Response.json(response);
      } catch (error) {
        return Response.json(
          { error: "Internal Server Error" },
          { status: 500 }
        );
      }
    }

    // 解析路径参数
    const pathParts = pathname.split("/").filter((part) => part !== "");

    // 处理文件路径 - /:channel/:chart/:fileType
    if (pathParts.length === 3) {
      const channel = pathParts[0];
      const chartId = pathParts[1];
      const fileType = pathParts[2]!;

      // 只处理特定的文件类型
      if (["illustration", "preview", "file"].includes(fileType)) {
        try {
          const fileUrl = `${env.staticURL}/${channel}/${chartId}/${fileType}`;
          const fileResponse = await fetch(fileUrl);

          if (!fileResponse.ok) {
            return Response.json({ error: "File not found" }, { status: 404 });
          }

          // 如果proxy为true，则转发文件内容
          if (proxy) {
            const fileData = await fileResponse.arrayBuffer();
            const contentType =
              fileResponse.headers.get("content-type") ||
              "application/octet-stream";

            return new Response(fileData, {
              headers: {
                "content-type": contentType,
                "cache-control": "public, max-age=3600",
              },
            });
          } else {
            // 如果proxy为false，返回重定向到原始文件
            return Response.redirect(fileUrl, 302);
          }
        } catch (error) {
          return Response.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        }
      }
    }

    // 处理频道路径 - /:channel
    if (pathParts.length === 1) {
      const channel = pathParts[0];

      try {
        // 获取频道信息
        const channelResponse = await fetch(
          `${env.staticURL}/${channel}/channel.json`
        );
        if (!channelResponse.ok) {
          return Response.json({ error: "Channel not found" }, { status: 404 });
        }

        const channelData: ChannelInfo = await channelResponse.json();

        // 获取搜索参数
        const page = parseInt(searchParams.get("page") || "1");
        const pageNum = parseInt(searchParams.get("pageNum") || "20");

        // 获取所有铺面数据
        const charts: Chart[] = [];

        for (const chartId of channelData.charts) {
          try {
            const chartResponse = await fetch(
              `${env.staticURL}/${channel}/${chartId}/chart.json`
            );
            if (chartResponse.ok) {
              const chartData: ChartInfo = await chartResponse.json();
              // 根据proxy设置生成文件URL
              const baseUrl = proxy
                ? url.origin || request.url.replace(/\/$/, "")
                : env.staticURL;
              const fileBasePath = `${channel}/${chartId}`;
              const chart: Chart = {
                id: chartId || "",
                name: chartData.name,
                level: chartData.level,
                difficulty: chartData.difficulty,
                charter: chartData.charter,
                composer: chartData.composer,
                illustrator: chartData.illustrator,
                description: chartData.description,
                illustration: `${baseUrl}/${fileBasePath}/illustration`,
                preview: `${baseUrl}/${fileBasePath}/preview`,
                file: `${baseUrl}/${fileBasePath}/file`,
              };

              charts.push(chart);
            }
          } catch (error) {
            // 跳过无法获取的铺面
            continue;
          }
        }

        // 分页处理
        const startIndex = (page - 1) * pageNum;
        const endIndex = startIndex + pageNum;
        const paginatedCharts = charts.slice(startIndex, endIndex);

        const response = {
          name: channelData.name,
          description: channelData.description,
          count: charts.length,
          charts: paginatedCharts,
        };

        return Response.json(response);
      } catch (error) {
        return Response.json(
          { error: "Internal Server Error" },
          { status: 500 }
        );
      }
    }

    // 处理特定铺面路径 - /:channel/:id
    if (pathParts.length === 2) {
      const channel = pathParts[0];
      const chartId = pathParts[1];

      try {
        const chartResponse = await fetch(
          `${env.staticURL}/${channel}/${chartId}/chart.json`
        );
        if (!chartResponse.ok) {
          return Response.json({ error: "Chart not found" }, { status: 404 });
        }

        const chartData: ChartInfo = await chartResponse.json();
        // 根据proxy设置生成文件URL
        const baseUrl = proxy
          ? url.origin || request.url.replace(/\/$/, "")
          : env.staticURL;
        const fileBasePath = `${channel}/${chartId}`;
        const chart: Chart = {
          id: chartId || "",
          name: chartData.name,
          level: chartData.level,
          difficulty: chartData.difficulty,
          charter: chartData.charter,
          composer: chartData.composer,
          illustrator: chartData.illustrator,
          description: chartData.description,
          illustration: `${baseUrl}/${fileBasePath}/illustration`,
          preview: `${baseUrl}/${fileBasePath}/preview`,
          file: `${baseUrl}/${fileBasePath}/file`,
        };

        return Response.json(chart);
      } catch (error) {
        return Response.json(
          { error: "Internal Server Error" },
          { status: 500 }
        );
      }
    }

    // 处理未知路径
    return Response.json({ error: "Not Found" }, { status: 404 });
  },
};
