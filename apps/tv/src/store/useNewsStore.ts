import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    getArticlesForHome,
    getVideosForHome,
    getTickerTexts,
    getInterviews,
    getActiveBanners,
    getActiveAds,
    getCalendarEvents,
    fetchVideosBySearch
} from '@/lib/data';
import { Article, Video, Interview, Banner, Ad, CalendarEvent } from '@/lib/types';

interface NewsState {
    allNews: Article[];
    featuredNews: Article[];
    secondaryNews: Article[];
    tertiaryNews: Article[];
    otherNews: Article[];
    allTickerTexts: string[];
    galleryVideos: Video[];
    interviews: Interview[];
    activeBanners: Banner[];
    activeAds: Ad[];
    calendarEvents: CalendarEvent[];

    isLoading: boolean;
    isLoadingVideos: boolean;
    isLoadingInterviews: boolean;
    isLoadingBanners: boolean;
    adsLoading: boolean;
    eventsLoading: boolean;
    isLoadingConfig: boolean;

    // Error handling
    error: string | null;

    // Search
    searchQuery: string;
    searchResults: Video[];
    isSearching: boolean;
    searchLoading: boolean;

    // Actions
    fetchInitialData: () => Promise<void>;
    handleSearch: (query: string) => Promise<void>;
    setSearchQuery: (query: string) => void;

    // Getters (functions that help access data)
    getNewsBySlug: (slug: string) => Article | undefined;
    getNewsById: (id: string | number) => Article | undefined;
    addVideoToPool: (video: Video) => void;
}

export const useNewsStore = create<NewsState>()(
    devtools(
        (set, get) => ({
            allNews: [],
            featuredNews: [],
            secondaryNews: [],
            tertiaryNews: [],
            otherNews: [],
            allTickerTexts: [],
            galleryVideos: [],
            interviews: [],
            activeBanners: [],
            activeAds: [],
            calendarEvents: [],

            isLoading: true,
            isLoadingVideos: true,
            isLoadingInterviews: true,
            isLoadingBanners: true,
            adsLoading: true,
            eventsLoading: true,
            isLoadingConfig: true,

            error: null,

            searchQuery: '',
            searchResults: [],
            isSearching: false,
            searchLoading: false,

            fetchInitialData: async () => {
                set({
                    isLoading: true,
                    isLoadingVideos: true,
                    isLoadingInterviews: true,
                    isLoadingBanners: true,
                    adsLoading: true,
                    eventsLoading: true,
                    isLoadingConfig: true,
                    error: null
                }, false, 'fetchInitialData/start');

                try {
                    // Priority 1: High-impact data for the initial TV UI (Videos + Ticker)
                    const [videosResult, tickerTexts] = await Promise.all([
                        getVideosForHome(),
                        getTickerTexts(),
                    ]);

                    const safeVideos = (videosResult || { allVideos: [] }).allVideos;

                    set({
                        allTickerTexts: tickerTexts,
                        galleryVideos: safeVideos,
                        isLoadingVideos: false,
                        // Ticker is ready
                    }, false, 'fetchInitialData/priority1-success');

                    // Priority 2: Deferred data (Articles, Banners, Ads, Interviews)
                    // We wait 100ms to let the UI breathe after the initial render of priority 1 data
                    setTimeout(async () => {
                        try {
                            const [articlesResult, interviews, banners, ads, events] = await Promise.all([
                                getArticlesForHome(),
                                getInterviews(),
                                getActiveBanners(),
                                getActiveAds(),
                                getCalendarEvents(),
                            ]);

                            const safeArticles = (articlesResult || { allNews: [] }).allNews;

                            // Single-pass categorization for articles
                            const featuredNews: Article[] = [];
                            const secondaryNews: Article[] = [];
                            const tertiaryNews: Article[] = [];
                            const otherNews: Article[] = [];

                            for (const n of safeArticles) {
                                switch (n.featureStatus) {
                                    case 'featured': featuredNews.push(n); break;
                                    case 'secondary': secondaryNews.push(n); break;
                                    case 'tertiary': tertiaryNews.push(n); break;
                                    default: otherNews.push(n);
                                }
                            }

                            set({
                                allNews: safeArticles,
                                featuredNews,
                                secondaryNews,
                                tertiaryNews,
                                otherNews,
                                interviews: interviews,
                                activeBanners: banners,
                                activeAds: ads,
                                calendarEvents: events,
                                isLoading: false,
                                isLoadingInterviews: false,
                                isLoadingBanners: false,
                                adsLoading: false,
                                eventsLoading: false,
                                isLoadingConfig: false,
                            }, false, 'fetchInitialData/priority2-success');
                        } catch (err) {
                            console.error("Error in deferred fetch:", err);
                        }
                    }, 100);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error("Error fetching primary data in NewsStore:", error);

                    set({
                        error: errorMessage,
                        isLoading: false,
                        isLoadingVideos: false,
                    }, false, 'fetchInitialData/error');
                }
            },

            handleSearch: async (query: string) => {
                set({ searchQuery: query }, false, 'handleSearch/setQuery');

                if (!query.trim()) {
                    set({
                        isSearching: false,
                        searchResults: [],
                        error: null
                    }, false, 'handleSearch/clear');
                    return;
                }

                set({
                    isSearching: true,
                    searchLoading: true,
                    error: null
                }, false, 'handleSearch/start');

                try {
                    const results = await fetchVideosBySearch(query);
                    set({
                        searchResults: results
                    }, false, 'handleSearch/success');
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Search failed';
                    console.error("Error during search in NewsStore:", err);

                    set({
                        searchResults: [],
                        error: errorMessage
                    }, false, 'handleSearch/error');
                } finally {
                    set({
                        searchLoading: false
                    }, false, 'handleSearch/complete');
                }
            },

            setSearchQuery: (query: string) => set({ searchQuery: query }, false, 'setSearchQuery'),

            getNewsBySlug: (slug: string) => get().allNews.find((item: Article) => item.slug === slug),
            getNewsById: (id: string | number) => get().allNews.find((item: Article) => item.id.toString() === id.toString()),

            addVideoToPool: (video: Video) => {
                const { galleryVideos } = get();
                if (!galleryVideos.find((v: Video) => v.id.toString() === video.id.toString())) {
                    set({
                        galleryVideos: [video, ...galleryVideos]
                    }, false, 'addVideoToPool');
                }
            },
        }),
        {
            name: 'NewsStore',
            enabled: process.env.NODE_ENV === 'development'
        }
    )
);
