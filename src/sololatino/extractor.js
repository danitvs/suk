import {
    getMovie,
    getTv
} from "./tmdb.js";

import {
    searchSoloLatino
} from "./search.js";

import {
    getEpisodeUrl
} from "./series.js";

import {
    getEpisodeServers,
    resolvePlayerUrl
} from "./episode.js";

import {
    resolveEmbed69
} from "./resolvers/embed69.js";

import {
    resolveVidhide
} from "./resolvers/vidhide.js";

import {
    resolveStreamwish2
} from "./resolvers/streamwish2.js";

import {
    resolveVoe
} from "./resolvers/voe.js";

import {
    resolveXupalaсe
} from "./resolvers/xupalace.js";

import {
    resolvePelisSeriesHoy
} from "./resolvers/pelisserieshoy.js";

export async function extractStreams(
    tmdbId,
    mediaType,
    season,
    episode
) {

    console.log(
        "[SoloLatino] extractStreams()"
    );

    console.log(
        "[SoloLatino] TMDB:",
        tmdbId
    );

    console.log(
        "[SoloLatino] Type:",
        mediaType
    );

    console.log(
        "[SoloLatino] Season:",
        season
    );

    console.log(
        "[SoloLatino] Episode:",
        episode
    );

    try {

        // ==================================================
        // 1. TMDB
        // ==================================================

        const media =
            mediaType === "movie"
                ? await getMovie(
                    tmdbId
                )
                : await getTv(
                    tmdbId
                );

        if (
            !media?.title
        ) {

            console.log(
                "[SoloLatino] No se obtuvo información de TMDB"
            );

            return [];
        }

        console.log(
            "[SoloLatino] TMDB:",
            media.title,
            media.year
        );

        // ==================================================
        // 2. SEARCH
        // ==================================================

        const results =
            await searchSoloLatino(
                media
            );

        console.log(
            "[SoloLatino] Total results:",
            results.length
        );

        if (
            results.length === 0
        ) {

            console.log(
                "[SoloLatino] No search results"
            );

            return [];
        }

        // ==================================================
        // 3. SELECT CONTENT
        // ==================================================

        const selected =
            selectResult(
                results,
                media,
                mediaType
            );

        if (
            !selected
        ) {

            console.log(
                "[SoloLatino] No se encontró coincidencia"
            );

            return [];
        }

        console.log(
            "[SoloLatino] Selected:",
            selected.title
        );

        console.log(
            "[SoloLatino] URL:",
            selected.url
        );

        // ==================================================
        // 4. EPISODE
        // ==================================================

        let contentUrl =
            selected.url;

        if (
            mediaType === "tv"
        ) {

            if (
                !Number.isInteger(
                    Number(
                        season
                    )
                ) ||
                !Number.isInteger(
                    Number(
                        episode
                    )
                )
            ) {

                console.log(
                    "[SoloLatino] TV requiere season y episode"
                );

                return [];
            }

            contentUrl =
                await getEpisodeUrl(
                    selected.url,
                    Number(
                        season
                    ),
                    Number(
                        episode
                    )
                );

            if (
                !contentUrl
            ) {

                console.log(
                    `[SoloLatino] No se encontró S${season}E${episode}`
                );

                return [];
            }

            console.log(
                "[SoloLatino] Episode:",
                contentUrl
            );
        }

        // ==================================================
        // 5. SERVERS
        // ==================================================

        const servers =
            await getEpisodeServers(
                contentUrl
            );

        console.log(
            "[SoloLatino] Servers:",
            servers.length
        );

        if (
            servers.length === 0
        ) {

            return [];
        }

        // ==================================================
        // 6. RESOLVE SERVERS
        // ==================================================

        const streams =
            [];

        const processedPlayers =
            new Set();

        for (
            const server of servers
        ) {

            if (
                !server?.playerToken
            ) {

                console.log(
                    "[SoloLatino] Server sin token:",
                    server?.label
                );

                continue;
            }

            console.log(
                "[SoloLatino] Processing server:",
                server.label
            );

            try {

                // ------------------------------------------------
                // Obtener URL real del player
                // ------------------------------------------------

                const player =
                    await resolvePlayerUrl(
                        server
                    );

                if (
                    !player?.url
                ) {

                    console.log(
                        "[SoloLatino] Player sin URL:",
                        server.label
                    );

                    continue;
                }

                console.log(
                    "[SoloLatino] Player:",
                    player.url
                );

                // ------------------------------------------------
                // Evitar duplicados
                // ------------------------------------------------

                if (
                    processedPlayers.has(
                        player.url
                    )
                ) {

                    console.log(
                        "[SoloLatino] Player duplicado:",
                        player.url
                    );

                    continue;
                }

                processedPlayers.add(
                    player.url
                );

                // =================================================
                // PELISSERIESHOY
                // =================================================

                if (false && isPelisSeriesHoy(player.url)) {

                    console.log(
                        "[SoloLatino] Resolver: PelisSeriesHoy"
                    );

                    try {

                        const resolved =
                            await resolvePelisSeriesHoy(
                                player.url,
                                contentUrl
                            );

                        console.log(
                            `[PelisSeriesHoy] Streams: ${resolved.length}`
                        );

                        for (
                            const stream of resolved
                        ) {

                            if (
                                !stream?.url
                            ) {
                                continue;
                            }

                            streams.push({
                                name:
                                    stream.name ||
                                    "SoloLatino PelisSeriesHoy",

                                title:
                                    media.title,

                                url:
                                    stream.url,

                                quality:
                                    stream.quality ||
                                    "auto",

                                language:

                                    server.language ||

                                        "LAT",

                                headers:
                                    stream.headers ||
                                    {}
                            });
                        }

                    } catch (
                        error
                    ) {

                        console.warn(
                            "[SoloLatino] PelisSeriesHoy error:",
                            error.message
                        );
                    }

                    continue;
                }
                // =================================================
                // EMBED69
                // =================================================

                if (
                    isEmbed69(
                        player.url
                    )
                ) {

                    console.log(
                        "[SoloLatino] Resolver: Embed69"
                    );

                    const files =
                        await resolveEmbed69(
                            player.url
                        );

                    console.log(
                        "[Embed69] Files:",
                        Array.isArray(
                            files
                        )
                            ? files.length
                            : 0
                    );

                    if (
                        !Array.isArray(
                            files
                        )
                    ) {

                        continue;
                    }

                    // ---------------------------------------------
                    // Procesar todos los sortedEmbeds
                    // ---------------------------------------------

                    for (
                        const file of files
                    ) {

                        if (
                            !Array.isArray(
                                file?.sortedEmbeds
                            )
                        ) {

                            continue;
                        }

                        const processedEmbeds =
                            new Set();

                        for (
                            const embed of
                            file.sortedEmbeds
                        ) {

                            if (
                                !embed?.link
                            ) {

                                continue;
                            }

                            const embedUrl =
                                embed.link;

                            if (
                                processedEmbeds.has(
                                    embedUrl
                                )
                            ) {

                                continue;
                            }

                            processedEmbeds.add(
                                embedUrl
                            );

                            const serverName =
                                String(
                                    embed.servername ||
                                    ""
                                )
                                    .trim()
                                    .toLowerCase();

                            console.log(
                                "[SoloLatino] Embed69 server:",
                                serverName,
                                "->",
                                embedUrl
                            );

                            // ======================================
                            // VIDHIDE
                            // ======================================

                            if (
                                serverName ===
                                "vidhide"
                            ) {

                                console.log(
                                    "[SoloLatino] Resolver Embed69 -> Vidhide"
                                );

                                try {

                                    const resolved =
                                        await resolveVidhide(
                                            embedUrl
                                        );

                                    if (
                                        !Array.isArray(
                                            resolved
                                        )
                                    ) {

                                        continue;
                                    }

                                    for (
                                        const stream of
                                        resolved
                                    ) {

                                        if (
                                            !stream?.url
                                        ) {

                                            continue;
                                        }

                                        streams.push({

                                            name:
                                                `SoloLatino Vidhide ${stream.quality || "auto"} ✅`,

                                            title:
                                                media.title,

                                            url:
                                                stream.url,

                                            quality:
                                                stream.quality ||
                                                "auto",

                                            language:

                                                embed.video_language ||

                                                    server.language ||

                                                    "LAT",

                                            headers:
                                                stream.headers ||
                                                {}
                                        });
                                    }

                                } catch (
                                    error
                                ) {

                                    console.warn(
                                        "[SoloLatino] Embed69 Vidhide error:",
                                        error.message
                                    );
                                }

                                continue;
                            }

                            // ======================================
                            // STREAMWISH
                            // ======================================

                            if (
                                serverName ===
                                "streamwish"
                            ) {

                                console.log(
                                    "[SoloLatino] Resolver Embed69 -> StreamWish"
                                );

                                try {

                                    const resolved =
                                        await resolveStreamwish2(
                                            embedUrl
                                        );

                                    if (
                                        !Array.isArray(
                                            resolved
                                        )
                                    ) {

                                        continue;
                                    }

                                    for (
                                        const stream of
                                        resolved
                                    ) {

                                        if (
                                            !stream?.url
                                        ) {

                                            continue;
                                        }

                                        streams.push({

                                            name:
                                                `SoloLatino StreamWish ${stream.quality || "auto"} ✅`,

                                            title:
                                                media.title,

                                            url:
                                                stream.url,

                                            quality:
                                                stream.quality ||
                                                "auto",

                                            language:

                                                embed.video_language ||

                                                    server.language ||

                                                    "LAT",

                                            headers:
                                                stream.headers ||
                                                {}
                                        });
                                    }

                                } catch (
                                    error
                                ) {

                                    console.warn(
                                        "[SoloLatino] Embed69 StreamWish error:",
                                        error.message
                                    );
                                }

                                continue;
                            }

                            // ======================================
                            // VOE
                            // ======================================

                            if (false && serverName === "voe") {

                                console.log(
                                    "[SoloLatino] Resolver Embed69 -> VOE"
                                );

                                try {

                                    const resolved =
                                        await resolveVoe(
                                            embedUrl
                                        );

                                    if (
                                        Array.isArray(
                                            resolved
                                        )
                                    ) {

                                        for (
                                            const stream of
                                            resolved
                                        ) {

                                            if (
                                                !stream?.url
                                            ) {

                                                continue;
                                            }

                                            streams.push({

                                                name:
                                                    `SoloLatino VOE ${stream.quality || "auto"} ✅`,

                                                title:
                                                    media.title,

                                                url:
                                                    stream.url,

                       
