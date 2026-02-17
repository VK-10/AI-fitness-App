package com.example.aiService.service;

import com.example.aiService.model.Activity;
import com.example.aiService.model.Recommendation;
import com.example.aiService.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityMessageListener {

//    @Value("${rabbitmq.queue.name}")
//    private String queueName;

    private final ActivityAIService aiService;
    private final RecommendationRepository recommendationRepository;

    @RabbitListener(queues = "activity.queue")
    public void processActivity(Activity activity) {
        log.info("Received activity for processing: {}", activity.getId());

        try {
            Recommendation recommendation = aiService.generateRecommendation(activity);
            recommendationRepository.save(recommendation);

            log.info("Generated Recommendation: {}", recommendation);
        } catch (Exception e) {
            log.error("Failed to generate recommendation for activity {}: {}",
                    activity.getId(), e.getMessage());
        }
    }

}
