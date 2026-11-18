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
