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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

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
          return Response.json(
            { error: "Site not found" },
            { status: 404, headers: CORS_HEADERS }
          );
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

        return Response.json(response, { headers: CORS_HEADERS });
      } catch (error) {
        return Response.json(
          { error: "Internal Server Error" },
          { status: 500, headers: CORS_HEADERS }
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
            return Response.json(
              { error: "File not found" },
              { status: 404, headers: CORS_HEADERS }
            );
          }

          // 如果proxy为true，则转发文件内容
          if (proxy) {
            // 使用流式传输来处理大文件
            const headers = new Headers();
            const contentType =
              fileResponse.headers.get("content-type") ||
              "application/octet-stream";
            headers.set("content-type", contentType);
            // 禁用文件下载的缓存
            headers.set("cache-control", "no-cache, no-store, must-revalidate");
            headers.set("pragma", "no-cache");
            headers.set("expires", "0");

            // 添加Content-Disposition头信息以确保文件下载
            const contentDisposition = fileResponse.headers.get(
              "content-disposition"
            );
            if (contentDisposition) {
              headers.set("content-disposition", contentDisposition);
            } else {
              // 如果没有提供content-disposition，设置一个默认的
              // 获取chart名称用于文件名
              let filename = `${chartId}_${fileType}`;
              try {
                const chartResponse = await fetch(
                  `${env.staticURL}/${channel}/${chartId}/chart.json`
                );
                if (chartResponse.ok) {
                  const chartData: ChartInfo = await chartResponse.json();
                  filename = `${chartData.name}_${fileType}`;
                }
              } catch (error) {
                // 如果获取chart名称失败，继续使用chartId
              }
              // 为曲绘和预览文件添加适当的文件扩展名
              if (fileType === "illustration") {
                filename += ".png";
              } else if (fileType === "preview") {
                filename += ".ogg"; // 假设预览文件是mp3格式
              }
              headers.set(
                "content-disposition",
                `attachment; filename="${filename}"`
              );
            }

            // 添加CORS头信息
            Object.entries(CORS_HEADERS).forEach(([key, value]) => {
              headers.set(key, value);
            });

            // 直接返回原始响应，避免内存限制问题
            return new Response(fileResponse.body, {
              headers: headers,
            });
          } else {
            // 如果proxy为false，返回重定向到原始文件
            return Response.redirect(fileUrl, 302);
          }
        } catch (error) {
          return Response.json(
            { error: "Internal Server Error" },
            { status: 500, headers: CORS_HEADERS }
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
          return Response.json(
            { error: "Channel not found" },
            { status: 404, headers: CORS_HEADERS }
          );
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

        return Response.json(response, { headers: CORS_HEADERS });
      } catch (error) {
        return Response.json(
          { error: "Internal Server Error" },
          { status: 500, headers: CORS_HEADERS }
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
          return Response.json(
            { error: "Chart not found" },
            { status: 404, headers: CORS_HEADERS }
          );
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

        return Response.json(chart, { headers: CORS_HEADERS });
      } catch (error) {
        return Response.json(
          { error: "Internal Server Error" },
          { status: 500, headers: CORS_HEADERS }
        );
      }
    }

    // 处理未知路径
    return Response.json(
      { error: "Not Found" },
      { status: 404, headers: CORS_HEADERS }
    );
  },
};
