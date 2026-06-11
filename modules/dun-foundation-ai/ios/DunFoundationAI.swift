import ExpoModulesCore
import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

enum DunFoundationAIError: Error, LocalizedError {
  case unavailable
  case unsupportedSDK

  var errorDescription: String? {
    switch self {
    case .unavailable:
      return "Apple Foundation Models n'est pas disponible sur cet appareil."
    case .unsupportedSDK:
      return "Le SDK Foundation Models n'est pas disponible dans cette build."
    }
  }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
struct DunFeedbackRewrite {
  @Guide(description: "Reponse finale en francais naturel, 2 a 4 phrases maximum, fidele au plan fourni.")
  let response: String
}

@available(iOS 26.0, *)
@Generable
struct DunStatsAnalysisRewrite {
  @Guide(description: "Analyse statistique finale en francais naturel, 5 phrases maximum, fidele aux donnees JSON.")
  let response: String
}

@available(iOS 26.0, *)
actor DunFoundationAIService {
  private var session: LanguageModelSession?

  private var instructions: String {
    """
    Tu es un assistant discret integre dans Dun, une app de taches.
    Analyse uniquement les donnees JSON fournies par l'app.
    Ne devine jamais d'information absente.
    Reponds en francais, avec un ton humain, leger, encourageant et jamais moralisateur.
    Dun a deja fait l'analyse et pris la decision dans feedbackPlan.
    Ton role est uniquement de reformuler le plan en texte naturel.
    Ne change jamais la strategie, le ton, les faits ou le conseil.
    Respecte les avoid et n'ajoute pas de nouveau diagnostic.
    Garde 2 a 4 phrases maximum.
    """
  }

  private var statsInstructions: String {
    """
    Tu es un assistant discret integre dans Dun, une app de taches.
    Dun a deja analyse les statistiques et fourni un plan semantique dans statsFeedbackPlan.
    Ton role est d'ecrire une analyse naturelle a partir des intentions, faits et signaux fournis.
    Ne recalcule jamais les donnees et ne devine jamais d'information absente.
    Reponds en francais, avec un ton humain, clair, leger et jamais moralisateur.
    Ne parle pas de performance personnelle, parle de charge, rythme, repartition et stabilite.
    Tu peux reformuler librement, varier l'ordre et les transitions.
    N'ajoute aucun chiffre, aucune comparaison et aucun diagnostic qui ne sont pas deja fournis dans le plan.
    Garde 5 phrases maximum.
    """
  }

  func isAvailable() -> Bool {
    if case .available = SystemLanguageModel.default.availability {
      return true
    }

    return false
  }

  func prewarm() throws {
    guard isAvailable() else {
      throw DunFoundationAIError.unavailable
    }

    _ = getSession()
  }

  func analyzeDay(jsonPayload: String) async throws -> String {
    guard isAvailable() else {
      throw DunFoundationAIError.unavailable
    }

    let root = parseJSONObject(jsonPayload)
    let feedbackPayload = serializeJSONObject([
      "feedbackPlan": root["feedbackPlan"] ?? [:]
    ])

    let prompt = """
    Reformule le feedbackPlan pour l'utilisateur.
    Tu dois respecter strictement:
    - strategy: ne change pas le diagnostic
    - tone: garde ce ton
    - mainObservation, progressObservation et advice: conserve ces trois idees
    - facts: tous les faits doivent rester vrais
    - avoid: ne fais rien de ce qui est interdit
    N'invente aucune tendance, aucune tache, aucun conseil supplementaire.
    Reponse finale en 2 a 4 phrases maximum.

    JSON:
    \(feedbackPayload)
    """

    let response = try await makeSession().respond(
      to: prompt,
      generating: DunFeedbackRewrite.self
    )

    return response.content.response.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  func analyzeStats(jsonPayload: String) async throws -> String {
    guard isAvailable() else {
      throw DunFoundationAIError.unavailable
    }

    let root = parseJSONObject(jsonPayload)
    let statsPayload = serializeJSONObject([
      "statsFeedbackPlan": root["statsFeedbackPlan"] ?? [:]
    ])

    let prompt = """
    Reformule statsFeedbackPlan pour l'utilisateur.
    Tu dois respecter strictement:
    - intent: utilise cette lecture globale comme direction.
    - tone: respecte ce ton.
    - periodContext: situe la periode sans inventer de date.
    - keyFacts: tu peux utiliser ces chiffres, mais seulement ceux-ci.
    - signals: choisis les signaux les plus utiles et reformule-les librement.
    - adviceIntent: donne un conseil seulement si ce champ existe.
    - constraints.noNewNumbers: n'ajoute aucun chiffre nouveau.
    - constraints.noExtraComparison: n'ajoute aucune comparaison nouvelle.
    N'utilise jamais de symbole ou unite non presente dans le plan.
    Ne mentionne pas une donnee absente, meme pour dire qu'elle manque.
    Ne recopie pas les champs mot a mot: transforme les signaux en phrases naturelles.
    - Reponse finale en 5 phrases maximum.

    JSON:
    \(statsPayload)
    """

    let response = try await LanguageModelSession(instructions: statsInstructions).respond(
      to: prompt,
      generating: DunStatsAnalysisRewrite.self
    )

    return response.content.response.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func parseJSONObject(_ jsonPayload: String) -> [String: Any] {
    guard
      let data = jsonPayload.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data),
      let dictionary = object as? [String: Any]
    else {
      return [:]
    }

    return dictionary
  }

  private func serializeJSONObject(_ object: [String: Any]) -> String {
    guard
      JSONSerialization.isValidJSONObject(object),
      let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]),
      let json = String(data: data, encoding: .utf8)
    else {
      return "{}"
    }

    return json
  }

  private func getSession() -> LanguageModelSession {
    if let session {
      return session
    }

    let newSession = LanguageModelSession(instructions: instructions)
    session = newSession
    return newSession
  }

  private func makeSession() -> LanguageModelSession {
    LanguageModelSession(instructions: instructions)
  }
}
#endif

public class DunFoundationAI: Module {
  #if canImport(FoundationModels)
  @available(iOS 26.0, *)
  private static let service = DunFoundationAIService()
  #endif

  public func definition() -> ModuleDefinition {
    Name("DunFoundationAI")

    AsyncFunction("isAvailable") { (promise: Promise) in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        Task {
          promise.resolve(await Self.service.isAvailable())
        }
        return
      }
      #endif

      promise.resolve(false)
    }

    AsyncFunction("prewarm") { (promise: Promise) in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        Task {
          do {
            try await Self.service.prewarm()
            promise.resolve(nil)
          } catch {
            promise.reject(error)
          }
        }
        return
      }
      #endif

      promise.reject(DunFoundationAIError.unsupportedSDK)
    }

    AsyncFunction("analyzeDay") { (jsonPayload: String, promise: Promise) in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        Task {
          do {
            let response = try await Self.service.analyzeDay(jsonPayload: jsonPayload)
            promise.resolve(response)
          } catch {
            promise.reject(error)
          }
        }
        return
      }
      #endif

      promise.reject(DunFoundationAIError.unsupportedSDK)
    }

    AsyncFunction("analyzeStats") { (jsonPayload: String, promise: Promise) in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        Task {
          do {
            let response = try await Self.service.analyzeStats(jsonPayload: jsonPayload)
            promise.resolve(response)
          } catch {
            promise.reject(error)
          }
        }
        return
      }
      #endif

      promise.reject(DunFoundationAIError.unsupportedSDK)
    }
  }
}
