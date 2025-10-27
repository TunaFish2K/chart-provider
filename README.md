# Chart Provider
通过Cloudflare Worker，分发静态资源站的自制铺铺面。

## 部署
### 直接下载
可以在Release页面下载worker.min.js或者worker.js。（前者压缩过）
### 自行构建
```
git clone https://github.com/TunaFish2K/chart-provider
cd chart-provider
npm i
npm run build
```
产物在dist文件夹。  

在Cloudflare上创建Worker。  
将worker.min.js拷贝到编辑代码页面并部署。  
添加环境变量`staticURL`为你的静态资源站URL，不带尾部斜杠。  
根据Worker接口使用。

## 静态资源站接口
> 可以通过Github Page等服务托管。

`GET /repository.json`

获取站点信息以及所有铺面频道。
```typescript
type Response = {
    name: string;
    description: string;
    channels: string;[];
};
```

`GET /:channel/channel.json`

获取频道信息以及所有铺面。
```typescript
type Response = {
    name: string;
    description: string;
    charts: string[];
};
```

`GET /:channel/:chart/chart.json`

获取不带文件链接的铺面数据。
```typescript
type Response = {
   name: string;
   level: string;
   difficulty: number;
   charter: string;
   composer: string;
   illustrator: string;
   description: string; 
};

```

`GET /:channel/:chart/file`

`GET /:channel/:chart/illustration` 

`GET /:channel/:chart/preview`

铺面的文件。
## Worker接口

铺面数据格式：
```typescript
type Chart = {
    id: string;
    name: string;
    level: string; // 展示给用户的难度
    difficulty: number; // 实际的数值难度
    charter: string;
    composer: string;
    illustrator: string;
    description: string;
    
    illustration: string; // 曲绘URL
    preview: string; // 预览音乐URL
    file: string; // 铺面文件URL
};
```
`GET /`
```typescript
type Response = {
    name: string;
    description: string;
    channels: string[]; // url
};
```

`GET /:channel`   

搜索铺面，返回铺面列表。
```typescript 
type Search = {
    page?: number; 
    pageNum?: number; // 每页内容数量
};

type Response = {
    name: string;
    description: string;
    count: number;
    charts: Chart[];
};
```

`GET /:channel/:id`

获取特定铺面的内容。
```typescript
type Response = Chart;
```