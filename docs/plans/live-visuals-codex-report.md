# Live visuals: Codex lane report

## Batch 1

- `ActivationFunctionsDiagram`: The highlight moves across activation families because a learner needs to compare how each real function transforms the same input range.
- `ClipDualEncoderDiagram`: Image and text signals move into the shared space together because CLIP encodes both modalities in parallel before comparing their embeddings.
- `MessagePassingDiagram`: Messages move outward hop by hop because a graph node aggregates information from increasingly distant neighbours at each GNN layer.
- `RLNetworkFamilyDiagram`: The selected method advances through the RL network family because the diagram compares how successive architectures assign value and policy work.
- `SiameseTripletDiagram`: The embedding arrangement alternates before and after training because triplet loss pulls the positive toward the anchor while pushing the negative away.
- `SslMethodsDiagram`: The view alternates between contrastive and masked prediction because self-supervised learning can construct its training signal through either paired views or hidden content.
- `TcnDilatedConvDiagram`: The active dilation layer advances because each temporal convolution layer reaches farther into the causal history.
- `CausalMaskAnimated`: The matrix progresses from scores to masking to softmax because causal attention must block future positions before normalizing its weights.
- `AutoencoderDiagram`: Samples move through the encoder bottleneck and decoder while the mode alternates because autoencoders compress and reconstruct data, with VAEs replacing a point bottleneck by a sampled distribution.
- `BertInputRepresentationDiagram`: The active token column advances because BERT forms every input position by adding its token, segment, and position embeddings.
- `CnnArchitectureLineageDiagram`: The highlighted architecture advances through the lineage because each CNN family introduces a response to a limitation in the preceding designs.
- `CnnVsVitDiagram`: The view alternates between CNN and ViT connectivity because local convolution and global self-attention give patches different first-layer communication ranges.
- `ConvolutionOperationDiagram`: The kernel window moves across the image because convolution reuses the same filter at every spatial position.
- `DepthwiseSeparableConvDiagram`: The comparison alternates between standard and separable convolution because factorizing spatial filtering from channel mixing changes the computation while preserving the output shape.
- `PoolingOperationDiagram`: The active pooling window advances across the four quadrants because max pooling reduces each local region to its largest value.
- `ReceptiveFieldGrowthDiagram`: The highlighted receptive field expands layer by layer because stacked convolutions let one output depend on a wider input region.
- `ResNetSkipConnectionDiagram`: Activations travel through the transform and shortcut paths together because a residual block adds the identity input to the learned residual.
- `CatastrophicForgettingDiagram`: A cursor advances across sequential training because the performance gap appears as the model moves from one task phase to the next.
- `DiffusionForwardProcessDiagram`: The timestep advances from clean signal toward noise because the forward diffusion process adds noise progressively according to its schedule.
- `GanMinimaxDiagram`: Training progress advances as the generated distribution approaches the real one because the generator and discriminator improve through their minimax game.

## Batch 2

- `LrSchedulesDiagram`: Left static because it is a reference chart that overlays fixed learning-rate schedules for direct shape comparison.
- `LinearAttentionFactorizationDiagram`: Left static because it is a reference comparison of two multiplication orders and no value changes or travels in the shown matrix-shape argument.
- `RegressionLossesDiagram`: Left static because it is a reference chart whose purpose is simultaneous comparison of five fixed loss curves.
- `AttentionLayersCatalogDiagram`: The selected layer advances because the catalog compares the distinct computation performed by each attention-family building block.
- `ConvolutionalLayersCatalogDiagram`: The selected layer advances because the catalog compares which axes each convolutional layer operates on.
- `CoreBuildingBlocksDiagram`: The selected building block advances because dense, embedding, and flatten layers perform different tensor transformations.
- `NormalizationAxisDiagram`: The highlighted cells change with the selected method because each normalization family computes statistics over a different tensor axis.
- `RecurrentLayersCatalogDiagram`: The selected recurrent cell advances because RNN, LSTM, and GRU introduce successively different state-update mechanisms.
- `TransposedConvUpsampleDiagram`: Left static because it is a reference shape comparison between the fixed 2×2 input and 4×4 learned output.
- `BidirectionalRnnDiagram`: The active token advances because forward and backward recurrent states meet at every sequence position.
- `GruCellDiagram`: The active gate alternates because the reset and update gates control different stages of the GRU state update.
- `LstmCellDiagram`: The active gate advances because forget, input, candidate, and output gates act in sequence to update and expose the cell state.
- `RnnUnrolledDiagram`: The active cell advances one timestep at a time because an RNN reuses the same state-update computation across the sequence.
- `Seq2SeqAttentionDiagram`: The active decoder token advances because attention recomputes a new alignment over encoder states for every output step.
- `Seq2SeqDiagram`: The context vector pulses between normal and emphasized states because the whole encoded sequence must pass through that single bottleneck before decoding.
- `VanishingGradientDiagram`: The traced distance and recurrent weight advance because repeated Jacobian multiplication makes gradients decay or grow across timesteps.
- `LrScheduleDiagram`: Left static because it is a reference schedule plot whose fixed curve is intended for exact reading rather than process playback.
- `DetrSetPredictionDiagram`: Left static because the four learned queries are parallel set members, and animating them sequentially would incorrectly imply ordered prediction.
- `SemanticVsInstanceSegmentationDiagram`: The view alternates because semantic segmentation merges same-class pixels while instance segmentation keeps individual objects separate.
- `SwinWindowAttentionDiagram`: The windows alternate between regular and shifted layouts because Swin connects neighbouring windows by shifting the partition on the next block.
- `TwoStageVsOneStageDetectionDiagram`: The view alternates because two-stage detectors propose then classify regions while one-stage detectors predict boxes and classes directly.
- `UNetArchitectureDiagram`: Skip connections appear and disappear because U-Net preserves fine spatial detail by carrying encoder features directly to matching decoder stages.
- `ViTVariantsDiagram`: The highlighted variant advances because each Vision Transformer family changes its tokenization or attention locality.
- `ContinuousBatchingDiagram`: The occupancy view alternates because continuous batching replaces finished requests immediately while static batching leaves slots idle.
- `JudgePositionBiasDiagram`: The response order swaps because an LLM judge's first-position bias can reverse its verdict without changing response quality.
- `PagedAttentionDiagram`: The allocation view alternates because paged KV caches use non-contiguous on-demand blocks instead of contiguous over-reservation.
- `SpeculativeDecodingDiagram`: Draft tokens alternate between proposed and verified states because the target model accepts a matching prefix and rejects the remainder in one pass.

## Batch 3

- `InferenceFlowVisualizer`: Requests already move through every inference stage because decoding transforms one prompt into logits, filtered candidates, and a sampled token in order.
- `AlibiPositionalBiasDiagram`: The query cursor sweeps across key positions because ALiBi recomputes its distance penalty from the current query position.
- `ArchitectureFamiliesDiagram`: The mask family advances because encoder, decoder, and encoder-decoder models permit different attention connections.
- `AttentionVariantsKvCacheDiagram`: The attention variant advances because MHA, GQA, MQA, and MLA store different numbers and shapes of key/value representations.
- `BpeTokenizationDiagram`: The symbol sequence merges step by step because BPE repeatedly replaces the most frequent adjacent pair with one vocabulary token.
- `ContextWindowScalingDiagram`: The context cursor sweeps the curves because full attention cost grows quadratically while sliding-window cost grows linearly with sequence length.
- `KvCacheDiagram`: Generation steps accumulate and the mode alternates because caching computes only the new token's keys and values instead of recomputing the whole prefix.
- `MoeRoutingDiagram`: The selected token advances because an MoE router activates a different top-k expert subset for each token.
- `SamplingStrategiesDiagram`: The strategy advances because temperature, top-k, and top-p reshape the same next-token distribution in different ways.
- `SlidingWindowAttentionDiagram`: Left static because it is a parameter explorer whose fixed mask makes the selected window boundary directly readable.
- `SwiGluGatingDiagram`: Left static because it is a numerical gate explorer and automatic parameter changes would obscure the learner's chosen input comparison.
- `AutoregressiveVsDiffusionGenerationDiagram`: The step cursor advances while the mode alternates because autoregressive generation resolves positions left to right whereas diffusion refines positions in parallel.
- `VlmArchitectureDiagram`: The active stage advances because a VLM turns an image into visual features, projects them into language space, and then decodes text.
- `AlignmentPipelineDiagram`: The active stage advances because alignment proceeds from pretraining through supervised tuning, preference learning, and safety evaluation.
- `CapabilityCostLatencyTradeoffDiagram`: The selected model advances because the plot compares the capability, cost, and latency position of each deployment choice.
- `FrozenWeightsVsFineTuningDiagram`: The view alternates because prompting changes activations with frozen weights while fine-tuning updates the weights themselves.
- `GenAiPipelineOverviewDiagram`: The active stage advances because a generative-AI system moves from data and pretraining through post-training, extension, and serving.
- `ScalingLawsGlanceDiagram`: The compute cursor sweeps the power-law curve because increasing compute moves the training run toward lower loss while preserving the compute-optimal split.
- `LostInTheMiddleDiagram`: The relevant fact moves through the context because its position alone produces the characteristic U-shaped retrieval accuracy.
- `PromptInjectionFlowDiagram`: The outcome alternates because treating retrieved text as instructions permits injection while treating it as untrusted data neutralizes it.
- `SelfConsistencyVotingDiagram`: Left static because it is a probability calculator whose selected path count and accuracy must remain stable for exact comparison.
- `TestTimeComputeScalingDiagram`: The budget cursor sweeps the curve because additional thinking tokens buy diminishing accuracy gains while increasing latency and cost.
- `EmbeddingSpaceExplorer`: Left static because it is a direct-manipulation spatial explorer and moving points automatically would imply that fixed embeddings drift at inference time.
- `RagPipelineSimulator`: Requests already move along the RAG graph because the query is chunked, retrieved, optionally reranked, and passed to generation in sequence.
- `AdvancedRagArchitecturesDiagram`: The architecture advances because each RAG variant adds a different branch, loop, hierarchy, or cache to the base retrieve-generate path.
- `BiEncoderVsCrossEncoderDiagram`: Left static because it is a fixed side-by-side architecture reference and sequential animation would incorrectly imply that either encoder runs after the other.
- `Bm25ScoringDiagram`: Left static because it is a score calculator whose term-frequency and length controls are intended for deliberate numeric inspection.
- `ChunkingStrategiesDiagram`: The strategy advances because fixed, semantic, recursive, and parent-child chunkers place boundaries differently on the same document.
- `DenseVsSparseRetrievalDiagram`: The scoring mode alternates because dense retrieval matches meaning while sparse retrieval depends on exact term overlap.
- `GraphRagDiagram`: The selected node advances because graph retrieval follows a different set of explicit relationships from each starting entity.
- `HybridSearchFusionDiagram`: Left static because it is a rank-fusion calculator whose fixed component rankings make the reciprocal-rank sum auditable.
- `QueryTransformationDiagram`: The technique advances because HyDE, decomposition, step-back, and multi-query send different derived queries to retrieval.
- `RagEvalMetricsDiagram`: The selected metric advances because faithfulness, relevance, precision, and recall count different evidence sets.
- `RetrievalFunnelMissDiagram`: Left static because it is a fixed recall-loss reference and motion would imply that the displayed miss rates change over time.
- `ThreeWayRetrievalArchitecturesDiagram`: Left static because it compares three independent retrieval architectures and cycling them would hide the simultaneous structural contrast.
- `DataPipelineStagesDiagram`: The active stage advances because pretraining data is progressively cleaned, deduplicated, filtered, checked, and packed.
- `DistillationDiagram`: The target alternates because hard labels discard the teacher's class relationships while soft targets preserve the full distribution.
- `DpoVsRlhfDiagram`: The method alternates because RLHF trains through a reward model and policy optimization while DPO learns directly from preference pairs.
- `GrpoVsPpoDiagram`: Left static because it is a controlled estimator comparison whose learner-selected group size should remain fixed while reading the computed baselines.
- `LoraMechanicsDiagram`: Left static because it is a rank-and-scale calculator whose matrix-shape result must remain tied to the learner's chosen values.
- `PeftMethodsComparisonDiagram`: The selected method advances because each PEFT method changes a different, much smaller subset of model parameters.
- `PreferenceOptimizationFamilyDiagram`: The selected method advances because IPO, KTO, ORPO, and RLOO change the baseline objective or required feedback format.
- `PretrainingObjectiveDiagram`: The active token advances because next-token pretraining emits a new probability distribution and loss contribution at every sequence position.
- `QuantizationBitDepthDiagram`: The precision advances because reducing bit depth coarsens the value grid while shrinking the same model's weight memory.
- `RlhfPipelineDiagram`: The active stage advances because RLHF samples outputs, gathers rankings, trains a reward model, optimizes the policy, and constrains drift.
- `ScalingLawsChinchillaDiagram`: Left static because it is a compute-allocation calculator whose selected budget must stay fixed while the parameter-token split is read.
- `SftBeforeAfterDiagram`: The response alternates because supervised fine-tuning changes a base model from continuing text patterns to following the instruction.
- `IsolationPathLengthDiagram`: Left static because it is a Monte Carlo result whose fixed seed keeps the displayed path-length comparison reproducible until the learner explicitly reruns it.

## Batch 4

- `AssociationRulesDiagram`: The active transaction advances because support and confidence are counted by checking each basket for the antecedent and consequent.
- `DbscanLiveDiagram`: The neighbourhood radius expands because DBSCAN changes core, border, and noise assignments as epsilon reaches more nearby points.
- `DecisionBoundaryPlayground`: Tree depth advances because each additional decision-tree level can partition the feature space into finer regions.
- `ElasticNetStudio`: The lambda cursor travels along the coefficient paths because stronger Elastic Net regularization continuously shrinks weights and can drive some to zero.
- `GmmSoftAssignmentDiagram`: EM iterations advance because each expectation-maximization update moves the component means and recomputes every point's soft membership.
- `HyperparamSearchDiagram`: Evaluated points appear in search order because each strategy spends the same budget on a different sequence of hyperparameter trials.
- `IcaCocktailPartyDiagram`: One time cursor sweeps all four signals together because each microphone mixture is formed from the source samples at that same instant.
- `LassoRegressionStudio`: The lambda cursor travels along the coefficient paths because increasing L1 regularization soft-thresholds features to exactly zero at different strengths.

## Batch 5

- `NdcgDiagram`: The highlighted rank moves down the result list because NDCG applies a different logarithmic discount at each position.
- `GradientDescentLoopDiagram`: The active stage advances around the loop because gradient descent repeatedly predicts, measures cost, finds the gradient, and updates the parameters in that order.
- `LinearRegressionAtAGlance`: The highlight advances from hypothesis through update because each training step consumes the result of the preceding calculation.
- `ResidualPlotDiagram`: The cursor inspects residuals from left to right because diagnosing a fit means checking whether errors stay patternless across the input range.
- `ScatterFitDiagram`: The fitted line draws across the observations because least squares turns the point cloud into one prediction line that minimizes their squared vertical distances.
- `TwoPathsDiagram`: The normal-equation path reaches the minimum in one jump while gradient descent reveals successive hops because the two solvers reach the same convex optimum directly and iteratively.
- `DataLeakageDiagram`: Emphasis alternates between the leaky and deployable scores because leakage creates an apparently strong evaluation that must be compared with the honest feature set.
- `SplitCrossValidationDiagram`: The view alternates from one fixed split to successive held-out folds because cross-validation rotates which examples validate the model while a train/validation/test split stays fixed.
- `BiasVarianceDecompositionDiagram`: The degree cursor moves across all three curves because increasing model complexity trades falling bias for rising variance and produces a middle error minimum.
- `CalibrationDiagram`: The active reliability bin advances and exposes its vertical gap because calibration compares predicted confidence with observed frequency at each confidence level.
- `RocPrCurveDiagram`: The operating point travels along the curve because changing the classification threshold changes the confusion counts and therefore the plotted rates.
- `LdaQdaBoundaryDiagram`: The fitted boundary alternates between LDA and QDA because shared covariance cancels the quadratic terms while per-class covariance preserves a curved separator.
- `PcaProjectionDiagram`: Each point drops onto PC1 and appears on the one-dimensional strip because PCA replaces the original point with its coordinate along the maximum-variance direction.
- `BaggingVarianceDiagram`: The cursor moves from one tree toward the full forest because averaging more correlated estimators reduces variance before approaching a correlation-imposed floor.
- `MatrixFactorizationDiagram`: Training epochs advance automatically because gradient descent progressively adjusts the latent factors to reconstruct observed ratings and infer missing cells.

## Batch 6

- `RidgeRegressionStudio`: The lambda cursor travels along the coefficient paths because stronger L2 regularization continuously shrinks correlated weights toward a more stable shared solution.
- `AlgorithmSelector`: Left static because it is a direct-manipulation decision tool, and choosing answers automatically would replace the learner's problem constraints rather than reveal a mechanism.
- `SgdLossPenaltyDiagram`: The loss-and-penalty configuration advances because changing the objective changes the gradient that fits the decision boundary to the same dataset.
- `KernelTrickDiagram`: The points rise from the original axis into their squared-feature coordinates because the explicit map turns a non-linearly separable 1D arrangement into a linearly separable 2D one.
- `ArimaDifferencingDiagram`: The differencing order advances because successive differences remove the trend and then reveal when extra differencing only adds noise.
- `TopicMixtureDiagram`: The document advances and its bars resize because different observed words produce different posterior mixtures over the same topics.
- `ConformalPredictionDiagram`: The miscoverage level advances and the prediction band resizes because a higher target coverage requires a larger calibration-residual quantile.
- `TreeGrowthStrategyDiagram`: Both split sequences reveal the same budget step in parallel because level-wise and leaf-wise growth spend each split on different available leaves.

## Batch 7

- `SpeculativeDecodingSimulator`: The workload advances through predictable, typical, and high-entropy drafts because acceptance rate determines how many proposed tokens the target model can verify and emit per pass.
- `TreeAttentionDraftDiagram`: The topology alternates between a linear chain and a branched tree because tree attention verifies several candidate continuations in parallel instead of betting on one draft path.
- `DisaggregatedServingArchDiagram`: The route alternates with prompt length because long prompts benefit from a separate prefill worker and KV transfer while short prompts avoid that network overhead on the decode worker.
- `DisaggregationPrefixCachingVisualizer`: The view alternates between worker disaggregation and prefix reuse because production serving reduces latency through both phase isolation and cached shared context.
- `RadixTreePrefixDiagram`: The cache topology alternates because radix prefixes can be reused across separate requests or extended across branches of one multi-turn conversation.
- `TinyMLTensorArenaVisualizer`: The active layer advances because a statically planned tensor arena reuses the same SRAM offsets as intermediate activations die and later layers begin.
- `KernelMemoryHierarchyVisualizer`: The view alternates from the memory hierarchy to FlashAttention tiling because the kernel avoids slow HBM traffic by moving bounded tiles through on-chip SRAM.
- `PagedAttentionVisualizer`: Token generation advances while the allocation mode alternates because paged KV blocks grow on demand whereas contiguous allocation reserves each request's maximum span up front.
- `QuantizationScaleVisualizer`: Precision advances from FP32 toward INT4 because each lower-bit representation coarsens the stored value while reducing model memory and bandwidth demand.
- `RooflineModelVisualizer`: The hardware target advances because each accelerator's compute-to-bandwidth ratio moves the roofline knee and changes the attainable performance of the same arithmetic intensity.
- `InferenceCurriculumDiagram`: The active stage advances because the curriculum builds inference engineering from hardware limits through batching, compression, edge execution, kernels, and distributed serving.
- `DeepRecommendersArchitectureExplorer`: The selected architecture advances because two-tower, Wide & Deep, DLRM, and SASRec encode different interaction patterns and therefore serve different funnel stages.
- `ExplorationFeedbackLoopExplorer`: The active experiment advances because contextual choice, counterfactual evaluation, and exposure dynamics are the three linked mechanisms needed to reason about exploration feedback loops.

## Batch 8

- `LearningToRankDiagram`: The objective advances because pointwise, pairwise, LambdaRank, and LambdaMART optimize the same candidate slate through different learning signals.
- `MatrixFactorizationExplorer`: ALS iterations advance because alternating updates progressively refit the user and item factors that reconstruct the observed ratings.
- `SearchRecommendationPipelineDiagram`: The active stage advances because candidates are generated, filtered, ranked, re-ranked, and served in that order.
- `RankingMetricsExplorer`: The cutoff advances because every ranking metric must be recomputed over the top-k prefix the evaluator chooses.
- `PageRankToyGraph`: Probability dots move along every directed link in parallel because each page distributes its current score across all outgoing links at once.
- `PageRankVisualizer`: Power iterations advance because PageRank repeatedly redistributes link mass until the node scores converge.
- `SearchSystemDesignExplorer`: The design view advances because latency budgets, resilience fallbacks, and capacity sizing expose three coupled operating constraints of the same serving system.
- `SemanticHybridSearchDiagram`: The channel weighting advances because reciprocal-rank fusion changes the final order when lexical and dense retrieval contribute different strengths.
- `InvertedIndexVisualizer`: The Boolean query advances because each operator scans, intersects, unions, or subtracts a different pair of posting lists.
