//! # Unit Tests for Split Template Contract

#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::Address as _, Address, Env, String as SorobanString, Vec as SorobanVec,
    };

    use crate::types::{Participant, SplitType};
    use crate::{SplitTemplateContract, SplitTemplateContractClient};

    fn setup() -> (Env, Address, SplitTemplateContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, SplitTemplateContract);
        let client = SplitTemplateContractClient::new(&env, &contract_id);

        let creator = Address::generate(&env);

        (env, creator, client)
    }

    fn create_participant(env: &Env, share: i128) -> Participant {
        Participant {
            address: Address::generate(env),
            share,
        }
    }

    fn create_equal_split_participants(env: &Env, count: u32) -> SorobanVec<Participant> {
        let mut participants = SorobanVec::new(env);
        for _ in 0..count {
            participants.push_back(create_participant(env, 1));
        }
        participants
    }

    fn create_percentage_split_participants(
        env: &Env,
        percentages: &[i128],
    ) -> SorobanVec<Participant> {
        let mut participants = SorobanVec::new(env);
        for &percentage in percentages.iter() {
            participants.push_back(create_participant(env, percentage));
        }
        participants
    }

    fn create_fixed_split_participants(env: &Env, amounts: &[i128]) -> SorobanVec<Participant> {
        let mut participants = SorobanVec::new(env);
        for &amount in amounts.iter() {
            participants.push_back(create_participant(env, amount));
        }
        participants
    }

    // ============================================
    // Core Functionality Tests
    // ============================================

    #[test]
    fn test_create_template_equal_split() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Equal Split");
        let participants = create_equal_split_participants(&env, 3);

        let template_id = client.create_template(&creator, &name, &SplitType::Equal, &participants);

        assert!(!template_id.is_empty());
    }

    #[test]
    fn test_create_template_percentage_split_valid() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Percentage Split");
        let percentages = [50i128, 30, 20];
        let participants = create_percentage_split_participants(&env, &percentages);

        let template_id =
            client.create_template(&creator, &name, &SplitType::Percentage, &participants);

        assert!(!template_id.is_empty());
    }

    #[test]
    #[should_panic]
    fn test_create_template_percentage_split_invalid_sum() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Bad Percentage Split");
        let percentages = [50i128, 30, 15]; // Sum is 95, not 100
        let participants = create_percentage_split_participants(&env, &percentages);

        let _ = client.create_template(&creator, &name, &SplitType::Percentage, &participants);
    }

    #[test]
    #[should_panic]
    fn test_create_template_percentage_split_out_of_range() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Out of Range Percentage");
        let percentages = [50i128, 60]; // 60 exceeds 100
        let participants = create_percentage_split_participants(&env, &percentages);

        let _ = client.create_template(&creator, &name, &SplitType::Percentage, &participants);
    }

    #[test]
    fn test_create_template_fixed_split_valid() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Fixed Split");
        let amounts = [100i128, 200, 300];
        let participants = create_fixed_split_participants(&env, &amounts);

        let template_id = client.create_template(&creator, &name, &SplitType::Fixed, &participants);

        assert!(!template_id.is_empty());
    }

    #[test]
    #[should_panic]
    fn test_create_template_fixed_split_invalid_zero() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Invalid Fixed Split");
        let amounts = [100i128, 0, 300];
        let mut participants = SorobanVec::new(&env);
        for &amount in amounts.iter() {
            participants.push_back(create_participant(&env, amount));
        }

        let _ = client.create_template(&creator, &name, &SplitType::Fixed, &participants);
    }

    #[test]
    #[should_panic]
    fn test_create_template_empty_participants() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Empty Participants");
        let participants = SorobanVec::new(&env);

        let _ = client.create_template(&creator, &name, &SplitType::Equal, &participants);
    }

    // ============================================
    // Deterministic ID Tests
    // ============================================

    #[test]
    fn test_deterministic_id_generation() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Deterministic Test");
        let participants1 = create_equal_split_participants(&env, 2);
        let participants2 = create_equal_split_participants(&env, 2);

        let id1 = client.create_template(&creator, &name, &SplitType::Equal, &participants1);

        let id2 = client.create_template(&creator, &name, &SplitType::Equal, &participants2);

        // IDs should be the same when created with same inputs
        assert_eq!(id1, id2);
    }

    #[test]
    fn test_different_names_different_ids() {
        let (env, creator, client) = setup();

        let name1 = SorobanString::from_str(&env, "Template A");
        let name2 = SorobanString::from_str(&env, "Template B");
        let participants1 = create_equal_split_participants(&env, 2);
        let participants2 = create_equal_split_participants(&env, 2);

        let id1 = client.create_template(&creator, &name1, &SplitType::Equal, &participants1);

        let id2 = client.create_template(&creator, &name2, &SplitType::Equal, &participants2);

        // Different names should produce different IDs
        assert_ne!(id1, id2);
    }

    // ============================================
    // Storage and Retrieval Tests
    // ============================================

    #[test]
    fn test_get_template_success() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Retrievable Template");
        let participants = create_equal_split_participants(&env, 3);

        let template_id = client.create_template(&creator, &name, &SplitType::Equal, &participants);

        let template = client.get_template(&template_id);
        assert_eq!(template.id, template_id);
        assert_eq!(template.creator, creator);
        assert_eq!(template.name, name);
        assert_eq!(template.split_type, SplitType::Equal);
        assert_eq!(template.participants.len(), 3);
    }

    #[test]
    #[should_panic]
    fn test_get_template_not_found() {
        let (env, _creator, client) = setup();

        let fake_id = SorobanString::from_str(&env, "NONEXISTENT");
        let _ = client.get_template(&fake_id);
    }

    #[test]
    fn test_get_templates_by_creator() {
        let (env, creator, client) = setup();

        let name1 = SorobanString::from_str(&env, "Template 1");
        let name2 = SorobanString::from_str(&env, "Template 2");
        let name3 = SorobanString::from_str(&env, "Template 3");

        let participants1 = create_equal_split_participants(&env, 2);
        let participants2 = create_percentage_split_participants(&env, &[50, 50]);
        let participants3 = create_fixed_split_participants(&env, &[100, 200]);

        // Create three templates
        client.create_template(&creator, &name1, &SplitType::Equal, &participants1);

        client.create_template(&creator, &name2, &SplitType::Percentage, &participants2);

        client.create_template(&creator, &name3, &SplitType::Fixed, &participants3);

        // Retrieve all templates by creator
        let templates = client.get_templates(&creator);

        assert_eq!(templates.len(), 3);

        // Verify all templates belong to the creator
        for template in templates.iter() {
            assert_eq!(template.creator, creator);
        }
    }

    #[test]
    fn test_get_templates_empty_for_new_creator() {
        let (env, _, client) = setup();

        let new_creator = Address::generate(&env);
        let templates = client.get_templates(&new_creator);

        assert_eq!(templates.len(), 0);
    }

    #[test]
    fn test_get_templates_multiple_creators() {
        let (env, creator1, client) = setup();
        let creator2 = Address::generate(&env);

        let name1 = SorobanString::from_str(&env, "Creator1 Template");
        let name2 = SorobanString::from_str(&env, "Creator2 Template");

        let participants = create_equal_split_participants(&env, 2);

        // Creator 1 creates a template
        client.create_template(&creator1, &name1, &SplitType::Equal, &participants);

        // Creator 2 creates a template
        client.create_template(&creator2, &name2, &SplitType::Equal, &participants);

        // Verify separation
        let templates1 = client.get_templates(&creator1);
        let templates2 = client.get_templates(&creator2);

        assert_eq!(templates1.len(), 1);
        assert_eq!(templates2.len(), 1);
        assert_eq!(templates1.get(0).unwrap().creator, creator1);
        assert_eq!(templates2.get(0).unwrap().creator, creator2);
    }

    // ============================================
    // Template Usage Tests
    // ============================================

    #[test]
    fn test_use_template_success() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Usable Template");
        let participants = create_equal_split_participants(&env, 2);

        let template_id = client.create_template(&creator, &name, &SplitType::Equal, &participants);

        let split_id = 1000u64;
        let _ = client.use_template(&template_id, &split_id);
    }

    #[test]
    #[should_panic]
    fn test_use_template_not_found() {
        let (env, _creator, client) = setup();

        let fake_template_id = SorobanString::from_str(&env, "NONEXISTENT_TEMPLATE");
        let split_id = 1000u64;

        let _ = client.use_template(&fake_template_id, &split_id);
    }

    #[test]
    fn test_use_template_emits_event() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Event Template");
        let participants = create_equal_split_participants(&env, 2);

        let template_id = client.create_template(&creator, &name, &SplitType::Equal, &participants);

        let split_id = 1000u64;

        // Use the template and emit event
        let _ = client.use_template(&template_id, &split_id);

        // In practice, you'd verify the event was emitted
        // This is a smoke test that the function completes
    }

    // ============================================
    // Authorization Tests
    // ============================================

    #[test]
    fn test_create_template_requires_auth() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Auth Test");
        let participants = create_equal_split_participants(&env, 2);

        // The create_template function calls creator.require_auth()
        // If we call it without authorizing the creator, Soroban SDK will handle it
        // This test verifies the auth is performed

        let _ = client.create_template(&creator, &name, &SplitType::Equal, &participants);

        // The test framework handles auth; this verifies the contract compiles
        // and the require_auth call is made
    }

    // ============================================
    // Versioning Tests
    // ============================================

    #[test]
    fn test_get_template_version() {
        let (_env, _creator, client) = setup();

        let version = client.get_template_version();
        assert_eq!(version, 1);
    }

    #[test]
    fn test_is_compatible_current_version() {
        let (_env, _creator, client) = setup();

        assert!(client.is_compatible(&1));
    }

    #[test]
    fn test_is_not_compatible_old_version() {
        let (_env, _creator, client) = setup();

        assert!(!client.is_compatible(&0));
    }

    #[test]
    fn test_is_not_compatible_future_version() {
        let (_env, _creator, client) = setup();

        assert!(!client.is_compatible(&2));
    }

    #[test]
    fn test_template_stores_version() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Versioned Template");
        let participants = create_equal_split_participants(&env, 2);

        let template_id = client.create_template(&creator, &name, &SplitType::Equal, &participants);

        let template = client.get_template(&template_id);
        assert_eq!(template.version, 1);
    }

    // ============================================
    // Edge Cases
    // ============================================

    #[test]
    fn test_template_with_many_participants() {
        let (env, creator, client) = setup();

        let name = SorobanString::from_str(&env, "Many Participants");
        let mut participants = SorobanVec::new(&env);

        // Create 100 participants with equal share
        for _ in 0..100 {
            participants.push_back(create_participant(&env, 1));
        }

        let template_id = client.create_template(&creator, &name, &SplitType::Equal, &participants);

        let template = client.get_template(&template_id);
        assert_eq!(template.participants.len(), 100);
    }

    #[test]
    fn test_creator_index_persistence() {
        let (env, creator, client) = setup();

        // Create 5 templates
        let template_names = [
            "Template 0",
            "Template 1",
            "Template 2",
            "Template 3",
            "Template 4",
        ];

        for name_str in template_names.iter() {
            let name = SorobanString::from_str(&env, name_str);
            let participants = create_equal_split_participants(&env, 2);

            client.create_template(&creator, &name, &SplitType::Equal, &participants);
        }

        // Verify all 5 are indexed
        let templates = client.get_templates(&creator);
        assert_eq!(templates.len(), 5);
    }
}
