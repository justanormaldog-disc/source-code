import { FFmpeg } from './node_modules/@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from './node_modules/@ffmpeg/util';

// listeners
document.querySelector(".search").addEventListener("keyup", async function () {
    document.querySelector(".results").innerHTML = "";
    document.querySelector(".results").style.display = "none";
    const query = this.value;
    const data = await request(`${api.endpoint}/anime/search?q=${query}&page=1`);

    const dataset = Object.entries(data.animes).slice(0, 3);
    let HTML = "";

    dataset.forEach((result) => {
        const _result = result[1];
        HTML += `<div id="${_result.id}" class="result"><p>${_result.name}</p><div class="episodes"><p>${_result.episodes.sub}</p></div></div>`;
    });

    document.querySelector(".results").innerHTML = HTML;
    document.querySelector(".results").style.display = "block";

    document.querySelectorAll(".result").forEach((i) => {
        i.addEventListener("click", function () {
            anime.save(
                this.id,
                document.querySelector(`#${this.id} > p`),
                document.querySelector(`#${this.id} div p`)
            );

            document.querySelector(".search").value = "";
            document.querySelector(".results").innerHTML = "";
            document.querySelector(".results").style.display = "none";
        })
    })
});

document.querySelector(".download").addEventListener("click", () => {
    if (anime.info) {
        download(anime.info.id);
    } else {

        const filter = document.createElement("div");
        const container = document.createElement("div");
        const h1 = document.createElement("h1");
        const p = document.createElement("p");
        const e = document.createElement("p");
        const buttonClose = document.createElement("button");

        h1.textContent = "There is no media selected!";
        p.textContent = `Select media through the Search bar.`;
        e.textContent = "";
        buttonClose.textContent = "Ok!";

        filter.className = "filter";
        container.className = "popup";

        document.body.appendChild(filter);
        document.body.appendChild(container);
        container.appendChild(h1);
        container.appendChild(p);
        container.appendChild(e);
        container.appendChild(buttonClose);

        buttonClose.addEventListener("click", () => { filter.remove(); container.remove() });
    }
});

const anime = {
    save: function (id, name, episodes) {
        this.info = {
            id,
            name,
            episodes
        }
        document.querySelector(".thumbnail").innerHTML = `<p>Name: ${name.innerHTML}</p><p>Total Episodes: ${episodes.innerHTML}</p>`
    }
}

const M3U8_to_MP4 = async (M3U8_URL) => {
    // Initialize FFmpeg.wasm
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();

    // Fetch M3U8 playlist file from URL
    const m3u8Url = M3U8_URL;
    const response = await fetch(m3u8Url);
    const m3u8Data = await response.text();

    // Run FFmpeg command to convert M3U8 to MP4
    ffmpeg.FS('writeFile', 'input.m3u8', new TextEncoder().encode(m3u8Data));
    await ffmpeg.run('-i', 'input.m3u8', 'output.mp4');

    // Read the generated MP4 file
    const data = ffmpeg.FS('readFile', 'output.mp4');

    // Clean up
    ffmpeg.FS('unlink', 'input.m3u8');
    ffmpeg.FS('unlink', 'output.mp4');

    const combinedVideoBlob = new Blob([data], { type: 'video/mp4' });
    return URL.createObjectURL(combinedVideoBlob);
};

const api = {
    endpoint: "https://api-1-js.vercel.app"
};

async function request(url) {
    let returnStatement;
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        returnStatement = data;
    } catch (error) {
        returnStatement = error;

        const filter = document.createElement("div");
        const container = document.createElement("div");
        const h1 = document.createElement("h1");
        const p = document.createElement("p");
        const e = document.createElement("p");
        const buttonClose = document.createElement("button");

        h1.textContent = "Whoops!";
        p.textContent = `There has been an error on our servers!`;
        e.textContent = error;
        buttonClose.textContent = "Ok!";

        filter.className = "filter";
        container.className = "popup";

        document.body.appendChild(filter);
        document.body.appendChild(container);
        container.appendChild(h1);
        container.appendChild(p);
        container.appendChild(e);
        container.appendChild(buttonClose);

        buttonClose.addEventListener("click", () => { filter.remove(); container.remove() });
        console.error(error);
    }

    return returnStatement;
}

async function download(id) {
    let HTML = "";
    async function getTotalEps() {
        const data = await request(`${api.endpoint}/anime/episodes/${id}`);
        return data.totalEpisodes;
    }

    async function getDownloadLinks() {
        const links = [];
        if (document.querySelector(".download-results")) document.querySelector(".download-results").remove();
        document.querySelector(".options").insertAdjacentHTML("afterend", `<div class="download-results"><p>Loading...</p><p>This may take up to two minutes</p></div>`)
        for (let i = 0; i < await getTotalEps() + 1; i++) {
            const data = await request(`${api.endpoint}/anime/episode-srcs?id=${id}?ep=${i + 1}`);

            links.push(await M3U8_to_MP4(data.sources[0]));
        }

        return links;
    }
    let counter = 0;
    (await getDownloadLinks()).forEach((link) => {
        counter++;
        HTML += `<div><a href=${link.url}>Episode ${counter - 1}</a>`
    })

    document.querySelector(".download-results").innerHTML = HTML;
}
