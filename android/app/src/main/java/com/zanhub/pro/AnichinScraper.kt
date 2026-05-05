package com.zanhub.pro

import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import org.jsoup.Jsoup

class AnichinScraper {

    private val mainUrl = "https://anichin.moe"
    private val userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

    @JavascriptInterface
    fun getLatestUpdate(page: Int): String {
        return try {
            val url = "$mainUrl/anime/?order=update&page=$page"
            val document = Jsoup.connect(url).userAgent(userAgent).timeout(10000).get()
            val jsonArray = JSONArray()
            val articles = document.select("div.listupd > article")
            
            for (article in articles) {
                val aTag = article.selectFirst("div.bsx > a")
                val imgTag = article.selectFirst("div.bsx > a img")
                val item = JSONObject()
                item.put("title", aTag?.attr("title")?.trim() ?: "")
                item.put("url", aTag?.attr("href") ?: "")
                item.put("poster", imgTag?.attr("src") ?: "")
                item.put("type", article.selectFirst(".limit .typez")?.text() ?: "Anime")
                jsonArray.put(item)
            }
            jsonArray.toString()
        } catch (e: Exception) {
            e.printStackTrace()
            "[]"
        }
    }

    @JavascriptInterface
    fun searchAnime(keyword: String): String {
        return try {
            val url = "$mainUrl/?s=$keyword"
            val document = Jsoup.connect(url).userAgent(userAgent).timeout(10000).get()
            val jsonArray = JSONArray()
            val articles = document.select("div.listupd > article")
            
            for (article in articles) {
                val aTag = article.selectFirst("div.bsx > a")
                val imgTag = article.selectFirst("div.bsx > a img")
                val item = JSONObject()
                item.put("title", aTag?.attr("title")?.trim() ?: "")
                item.put("url", aTag?.attr("href") ?: "")
                item.put("poster", imgTag?.attr("src") ?: "")
                item.put("type", article.selectFirst(".limit .typez")?.text() ?: "Anime")
                jsonArray.put(item)
            }
            jsonArray.toString()
        } catch (e: Exception) {
            e.printStackTrace()
            "[]"
        }
    }

    @JavascriptInterface
    fun getDetailAndEpisodes(url: String): String {
        return try {
            val document = Jsoup.connect(url).userAgent(userAgent).timeout(10000).get()
            val result = JSONObject()
            
            result.put("title", document.selectFirst("h1.entry-title")?.text()?.trim() ?: "")
            
            var poster = document.selectFirst("div.ime > img")?.attr("src") ?: ""
            if (poster.isEmpty()) poster = document.selectFirst("meta[property=og:image]")?.attr("content") ?: ""
            result.put("poster", poster)
            result.put("description", document.selectFirst("div.entry-content")?.text()?.trim() ?: "")

            val episodesArray = JSONArray()
            val episodeElements = document.select(".eplister li")
            
            for (ep in episodeElements) {
                val epLink = ep.selectFirst("a")?.attr("href") ?: ""
                val epTitle = ep.selectFirst(".epl-title")?.text()?.trim() ?: ""
                val epSub = ep.selectFirst(".epl-sub span")?.text()?.trim() ?: ""
                val epDate = ep.selectFirst(".epl-date")?.text()?.trim() ?: ""
                
                val epObj = JSONObject()
                epObj.put("title", "$epTitle $epSub".trim())
                epObj.put("url", epLink)
                epObj.put("date", epDate)
                episodesArray.put(epObj)
            }
            result.put("episodes", episodesArray)
            result.toString()
        } catch (e: Exception) {
            e.printStackTrace()
            "{}"
        }
    }
}