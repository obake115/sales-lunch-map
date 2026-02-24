import WidgetKit
import SwiftUI

struct LunchMapEntry: TimelineEntry {
    let date: Date
    let todayPickName: String
    let todayPickNote: String
    let totalStores: Int
    let favorites: Int
    let reminders: Int
}

struct LunchMapProvider: TimelineProvider {
    private let suiteName = "group.jp.kawashun.saleslunchmap"

    func placeholder(in context: Context) -> LunchMapEntry {
        LunchMapEntry(
            date: Date(),
            todayPickName: "ランチスポット",
            todayPickNote: "",
            totalStores: 0,
            favorites: 0,
            reminders: 0
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LunchMapEntry) -> Void) {
        completion(readEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LunchMapEntry>) -> Void) {
        let entry = readEntry()
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func readEntry() -> LunchMapEntry {
        let defaults = UserDefaults(suiteName: suiteName)
        return LunchMapEntry(
            date: Date(),
            todayPickName: defaults?.string(forKey: "todayPickName") ?? "",
            todayPickNote: defaults?.string(forKey: "todayPickNote") ?? "",
            totalStores: defaults?.integer(forKey: "totalStores") ?? 0,
            favorites: defaults?.integer(forKey: "favorites") ?? 0,
            reminders: defaults?.integer(forKey: "reminders") ?? 0
        )
    }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let entry: LunchMapEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Text("🍴")
                    .font(.title3)
                Text("ランチマップ")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
            }

            if !entry.todayPickName.isEmpty {
                Text("今日のおすすめ")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundColor(.orange)
                Text(entry.todayPickName)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .lineLimit(2)
            } else {
                Text("お店を登録しよう")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text("\(entry.totalStores) 件登録")
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let entry: LunchMapEntry

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Text("🍴")
                        .font(.title3)
                    Text("ランチマップ")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                }

                if !entry.todayPickName.isEmpty {
                    Text("今日のおすすめ")
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundColor(.orange)
                    Text(entry.todayPickName)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .lineLimit(2)
                    if !entry.todayPickNote.isEmpty {
                        Text(entry.todayPickNote)
                            .font(.system(size: 11, design: .rounded))
                            .foregroundColor(.secondary)
                            .lineLimit(2)
                    }
                } else {
                    Text("お店を登録しよう")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 8) {
                StatBadge(value: entry.totalStores, label: "登録", color: .orange)
                StatBadge(value: entry.favorites, label: "お気に入り", color: .yellow)
                StatBadge(value: entry.reminders, label: "通知", color: .blue)
            }
            .frame(width: 70)
        }
        .padding()
    }
}

struct StatBadge: View {
    let value: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 1) {
            Text("\(value)")
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 9, weight: .medium, design: .rounded))
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Widget Configuration

struct LunchMapWidget: Widget {
    let kind = "LunchMapWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LunchMapProvider()) { entry in
            LunchMapWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("ランチマップ")
        .description("今日のおすすめランチスポットを表示します")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct LunchMapWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: LunchMapEntry

    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}
